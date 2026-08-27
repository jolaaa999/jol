package handler

import (
	"net/http"
	"strings"

	"github.com/jol/blog/api/_lib"
)

// Handler — GET /api/posts
// 列表：/api/posts
// 详情：/api/posts?id=r-001 或经 rewrite 的 /api/posts/:id
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.SetCORS(w)
	if lib.HandleOptions(w, r) {
		return
	}

	if r.Method != http.MethodGet {
		lib.WriteJSON(w, http.StatusMethodNotAllowed, lib.ErrorResponse{
			Error:   "method_not_allowed",
			Message: "only GET is supported",
		})
		return
	}

	if id := resolvePostID(r); id != "" {
		lib.ServeArticleDetail(w, r, id)
		return
	}

	lib.ServeArticleList(w, r, lib.CategoryReflection)
}

func resolvePostID(r *http.Request) string {
	if id := strings.TrimSpace(r.URL.Query().Get("id")); id != "" {
		return id
	}

	// rewrite 后仍可能保留原始路径 /api/posts/:id
	path := strings.TrimPrefix(r.URL.Path, "/api/posts")
	path = strings.Trim(path, "/")
	if path == "" || path == "index" {
		return ""
	}
	return path
}
