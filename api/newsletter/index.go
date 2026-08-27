package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jol/blog/api/_lib"
)

type newsletterRequest struct {
	Email string `json:"email"`
}

// Handler — POST /api/newsletter — 订阅占位（可对接 Mailchimp 等）
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
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" {
		lib.WriteJSON(w, http.StatusBadRequest, lib.ErrorResponse{
			Error:   "invalid_request",
			Message: "email is required",
		})
		return
	}

	lib.WriteJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "subscription recorded",
	})
}
