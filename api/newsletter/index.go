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

// Handler — POST /api/newsletter
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.SetCORS(w)
	if lib.HandleOptions(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		lib.WriteJSON(w, http.StatusMethodNotAllowed, lib.ErrorResponse{
			Error:   "method_not_allowed",
			Message: "only POST is supported",
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
		msg := "subscription failed"
		switch err.Error() {
		case "invalid_email":
			msg = "请输入有效邮箱"
		case "not_configured":
			msg = "邮件服务未配置，请联系站长"
		case "unsupported_provider":
			msg = "不支持的邮件服务提供商"
		default:
			if strings.Contains(err.Error(), "missing_") {
				msg = "邮件服务密钥未配置"
			}
		}
		lib.WriteJSON(w, status, lib.ErrorResponse{
			Error:   err.Error(),
			Message: msg,
		})
		return
	}

	lib.WriteJSON(w, status, result)
}
