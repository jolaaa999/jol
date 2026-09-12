package lib

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

// AdminToken 从环境变量读取后台口令
func AdminToken() string {
	return strings.TrimSpace(os.Getenv("ADMIN_TOKEN"))
}

// RequireAdmin 校验 Authorization: Bearer <ADMIN_TOKEN>
func RequireAdmin(r *http.Request) bool {
	expected := AdminToken()
	if expected == "" {
		return false
	}

	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	const prefix = "Bearer "
	if !strings.HasPrefix(auth, prefix) {
		return false
	}

	got := strings.TrimSpace(strings.TrimPrefix(auth, prefix))
	if got == "" {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(got), []byte(expected)) == 1
}
