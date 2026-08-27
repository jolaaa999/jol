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
// 支持：
//   NEWSLETTER_PROVIDER=resend|buttondown（可省略，自动检测）
//   RESEND_API_KEY / RESEND_FROM_EMAIL / RESEND_SEGMENT_ID / NEWSLETTER_NOTIFY_TO
//   BUTTONDOWN_API_KEY
func SubscribeNewsletter(email string) (NewsletterResult, int, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if _, err := mail.ParseAddress(email); err != nil {
		return NewsletterResult{}, http.StatusBadRequest, fmt.Errorf("invalid_email")
	}

	provider := strings.ToLower(strings.TrimSpace(os.Getenv("NEWSLETTER_PROVIDER")))
	if provider == "" {
		switch {
		case os.Getenv("RESEND_API_KEY") != "":
			provider = "resend"
		case os.Getenv("BUTTONDOWN_API_KEY") != "":
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
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("missing_resend_api_key")
	}

	contactBody := map[string]any{
		"email":        email,
		"unsubscribed": false,
	}
	if segmentID := strings.TrimSpace(os.Getenv("RESEND_SEGMENT_ID")); segmentID != "" {
		contactBody["segments"] = []map[string]string{{"id": segmentID}}
	}

	if err := resendRequest("POST", "https://api.resend.com/contacts", apiKey, contactBody); err != nil {
		// 已存在视为成功（幂等）
		if !strings.Contains(err.Error(), "already exists") &&
			!strings.Contains(err.Error(), "409") &&
			!strings.Contains(err.Error(), "contact_already_exists") {
			return err
		}
	}

	from := strings.TrimSpace(os.Getenv("RESEND_FROM_EMAIL"))
	if from == "" {
		from = "JOL <onboarding@resend.dev>"
	}

	siteURL := strings.TrimSpace(os.Getenv("SITE_URL"))
	if siteURL == "" {
		siteURL = "https://jol-ten.vercel.app"
	}

	_ = resendRequest("POST", "https://api.resend.com/emails", apiKey, map[string]any{
		"from":    from,
		"to":      []string{email},
		"subject": "欢迎订阅 JOL Newsletter",
		"html": fmt.Sprintf(`
			<div style="font-family:ui-monospace,monospace;line-height:1.7;color:#111">
			  <p>你好，</p>
			  <p>你已成功订阅 <strong>JOL</strong> 的 Newsletter。</p>
			  <p>之后有新文章时会邮件通知你（低频，无垃圾邮件）。</p>
			  <p><a href="%s/blog">阅读博客 →</a></p>
			  <p style="color:#666;font-size:12px">若非本人操作，可忽略本邮件。</p>
			</div>
		`, siteURL),
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

func subscribeButtondown(email string) error {
	apiKey := os.Getenv("BUTTONDOWN_API_KEY")
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
	// 201 created / 200 ok / 409 already subscribed
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	if res.StatusCode == http.StatusConflict {
		return nil
	}
	return fmt.Errorf("buttondown_%d: %s", res.StatusCode, string(raw))
}

func resendRequest(method, url, apiKey string, payload any) error {
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
