package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jol/blog/api/_lib"
)

type newsletterRequest struct {
	Email string `json:"email"`
}

// Handler — POST /api/newsletter 订阅 | GET /api/newsletter 诊断配置
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.SetCORS(w)
	if lib.HandleOptions(w, r) {
		return
	}

	if r.Method == http.MethodGet {
		handleHealth(w)
		return
	}

	if r.Method != http.MethodPost {
		lib.WriteJSON(w, http.StatusMethodNotAllowed, lib.ErrorResponse{
			Error:   "method_not_allowed",
			Message: "only GET and POST are supported",
		})
		return
	}

	var body newsletterRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		lib.WriteJSON(w, http.StatusBadRequest, lib.ErrorResponse{
			Error:   "invalid_request",
			Message: "invalid json body",
		})
		return
	}

	result, status, err := lib.SubscribeNewsletter(body.Email)
	if err != nil {
		msg := mapNewsletterError(err)
		lib.WriteJSON(w, status, lib.ErrorResponse{
			Error:   err.Error(),
			Message: msg,
		})
		return
	}

	lib.WriteJSON(w, status, result)
}

func handleHealth(w http.ResponseWriter) {
	valid, hint, errMsg := lib.VerifyResendKey()
	keyConfigured := errMsg != "RESEND_API_KEY 未设置"
	lib.WriteJSON(w, http.StatusOK, map[string]any{
		"provider":       "resend",
		"key_configured": keyConfigured,
		"key_hint":       hint,
		"key_valid":      valid,
		"message":        errMsg,
	})
}

func mapNewsletterError(err error) string {
	switch err.Error() {
	case "invalid_email":
		return "请输入有效邮箱"
	case "not_configured":
		return "邮件服务未配置，请在 Vercel 添加环境变量后 Redeploy"
	case "unsupported_provider":
		return "不支持的邮件服务提供商"
	case "missing_resend_api_key":
		return "未配置 RESEND_API_KEY"
	case "invalid_resend_api_key_format":
		return "RESEND_API_KEY 格式错误，应以 re_ 开头，且不要加引号"
	default:
		if strings.Contains(err.Error(), "missing_") {
			return "邮件服务密钥未配置"
		}
		if strings.Contains(err.Error(), "resend_401") || strings.Contains(err.Error(), "resend_403") {
			return "Resend API Key 无效或权限不足。请访问 resend.com/api-keys 重新生成 Full access 密钥，更新 Vercel 后 Redeploy。诊断：GET /api/newsletter"
		}
		if strings.Contains(err.Error(), "resend_") {
			return "邮件服务暂时不可用，请稍后重试"
		}
		return "订阅失败，请稍后重试"
	}
}
