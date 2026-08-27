package lib

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"os"
	"strings"
	"time"
)

// NewsletterResult 订阅结果
type NewsletterResult struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// SubscribeNewsletter 按环境变量对接邮件服务
func SubscribeNewsletter(email string) (NewsletterResult, int, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if _, err := mail.ParseAddress(email); err != nil {
		return NewsletterResult{}, http.StatusBadRequest, fmt.Errorf("invalid_email")
	}

	provider := strings.ToLower(strings.TrimSpace(os.Getenv("NEWSLETTER_PROVIDER")))
	if provider == "" {
		switch {
		case sanitizeAPIKey(os.Getenv("RESEND_API_KEY")) != "":
			provider = "resend"
		case strings.TrimSpace(os.Getenv("BUTTONDOWN_API_KEY")) != "":
			provider = "buttondown"
		default:
			return NewsletterResult{}, http.StatusServiceUnavailable, fmt.Errorf("not_configured")
		}
	}

	switch provider {
	case "resend":
		if err := subscribeResend(email); err != nil {
			return NewsletterResult{}, http.StatusBadGateway, err
		}
	case "buttondown":
		if err := subscribeButtondown(email); err != nil {
			return NewsletterResult{}, http.StatusBadGateway, err
		}
	default:
		return NewsletterResult{}, http.StatusBadRequest, fmt.Errorf("unsupported_provider")
	}

	return NewsletterResult{
		Status:  "ok",
		Message: "subscription recorded",
	}, http.StatusOK, nil
}

func subscribeResend(email string) error {
	apiKey := sanitizeAPIKey(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return fmt.Errorf("missing_resend_api_key")
	}
	if !strings.HasPrefix(apiKey, "re_") {
		return fmt.Errorf("invalid_resend_api_key_format")
	}

	contactBody := map[string]any{
		"email":        email,
		"unsubscribed": false,
	}

	segmentID := strings.TrimSpace(os.Getenv("RESEND_SEGMENT_ID"))
	if segmentID != "" {
		contactBody["segments"] = []map[string]string{{"id": segmentID}}
	}

	err := resendRequest("POST", "https://api.resend.com/contacts", apiKey, contactBody)
	if err != nil && segmentID != "" && isResendContactError(err) {
		// Segment 配置错误时，降级为仅创建联系人
		delete(contactBody, "segments")
		err = resendRequest("POST", "https://api.resend.com/contacts", apiKey, contactBody)
	}
	if err != nil && !isResendDuplicate(err) {
		return err
	}

	from := normalizeFromEmail(os.Getenv("RESEND_FROM_EMAIL"))
	siteURL := strings.TrimSpace(os.Getenv("SITE_URL"))
	if siteURL == "" {
		siteURL = "https://jol-ten.vercel.app"
	}

	// 欢迎信失败不阻断订阅（联系人已入库）
	_ = resendRequest("POST", "https://api.resend.com/emails", apiKey, map[string]any{
		"from":    from,
		"to":      []string{email},
		"subject": "欢迎订阅 JOL Newsletter",
		"html": fmt.Sprintf(`<div style="font-family:ui-monospace,monospace;line-height:1.7;color:#111">
<p>你好，</p>
<p>你已成功订阅 <strong>JOL</strong> 的 Newsletter。</p>
<p>之后有新文章时会邮件通知你。</p>
<p><a href="%s/blog">阅读博客 →</a></p>
</div>`, siteURL),
	})

	if notifyTo := strings.TrimSpace(os.Getenv("NEWSLETTER_NOTIFY_TO")); notifyTo != "" {
		_ = resendRequest("POST", "https://api.resend.com/emails", apiKey, map[string]any{
			"from":    from,
			"to":      []string{notifyTo},
			"subject": "JOL Newsletter：新订阅",
			"text":    fmt.Sprintf("新订阅邮箱：%s", email),
		})
	}

	return nil
}

func normalizeFromEmail(raw string) string {
	from := strings.TrimSpace(raw)
	from = strings.Trim(from, `"'`)
	if from == "" {
		return "JOL <onboarding@resend.dev>"
	}
	if !strings.Contains(from, "<") && strings.Contains(from, "@") {
		return fmt.Sprintf("JOL <%s>", from)
	}
	return from
}

func isResendDuplicate(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already exists") ||
		strings.Contains(msg, "contact_already_exists") ||
		strings.Contains(msg, "409") ||
		strings.Contains(msg, "duplicate")
}

func isResendContactError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "segment") ||
		strings.Contains(msg, "422") ||
		strings.Contains(msg, "validation")
}

func subscribeButtondown(email string) error {
	apiKey := strings.TrimSpace(os.Getenv("BUTTONDOWN_API_KEY"))
	if apiKey == "" {
		return fmt.Errorf("missing_buttondown_api_key")
	}

	body, _ := json.Marshal(map[string]string{"email": email})
	req, err := http.NewRequest(http.MethodPost, "https://api.buttondown.email/v1/subscribers", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Token "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	if res.StatusCode == http.StatusConflict {
		return nil
	}
	return fmt.Errorf("buttondown_%d: %s", res.StatusCode, string(raw))
}

func resendRequest(method, url, apiKey string, payload any) error {
	apiKey = sanitizeAPIKey(apiKey)
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(method, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("resend_%d: %s", res.StatusCode, string(raw))
}

func sanitizeAPIKey(raw string) string {
	key := strings.TrimSpace(raw)
	key = strings.Trim(key, `"'`)
	key = strings.ReplaceAll(key, "\n", "")
	key = strings.ReplaceAll(key, "\r", "")
	return key
}

// VerifyResendKey 调用 Resend API 验证 Key 是否有效（不暴露完整密钥）
func VerifyResendKey() (valid bool, hint string, errMsg string) {
	apiKey := sanitizeAPIKey(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return false, "", "RESEND_API_KEY 未设置"
	}
	if !strings.HasPrefix(apiKey, "re_") {
		return false, "", "Key 格式错误，应以 re_ 开头"
	}
	if len(apiKey) < 20 {
		return false, "", "Key 长度过短，可能复制不完整"
	}

	hint = apiKey[:min(7, len(apiKey))] + "…"

	req, err := http.NewRequest(http.MethodGet, "https://api.resend.com/domains", nil)
	if err != nil {
		return false, hint, err.Error()
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return false, hint, "无法连接 Resend API"
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode == http.StatusOK {
		return true, hint, ""
	}
	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
		return false, hint, "API Key 无效或权限不足，请在 Resend 重新生成 Full access 密钥"
	}
	return false, hint, fmt.Sprintf("resend_%d: %s", res.StatusCode, string(raw))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
