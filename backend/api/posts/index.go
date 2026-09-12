package handler

import (
	"net/http"
	"strings"

	"github.com/jol/blog/api/_lib"
)

// Handler — /api/posts
// GET    列表 / 详情（?id=）
// POST   新建（Bearer ADMIN_TOKEN）
// PUT    更新（Bearer ADMIN_TOKEN，需 id）
// DELETE 删除（Bearer ADMIN_TOKEN，需 id）
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.SetCORS(w)
	if lib.HandleOptions(w, r) {
		return
	}

	id := resolvePostID(r)

	switch r.Method {
	case http.MethodGet:
		if id != "" {
			lib.ServeArticleDetail(w, r, id)
			return
		}
		lib.ServeArticleList(w, r, lib.CategoryReflection)
	case http.MethodPost, http.MethodPut, http.MethodDelete:
		lib.ServeArticleWrite(w, r, id)
	default:
		lib.WriteJSON(w, http.StatusMethodNotAllowed, lib.ErrorResponse{
			Error:   "method_not_allowed",
			Message: "use GET / POST / PUT / DELETE",
		})
	}
}

func resolvePostID(r *http.Request) string {
	if id := strings.TrimSpace(r.URL.Query().Get("id")); id != "" {
		return id
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/posts")
	path = strings.Trim(path, "/")
	if path == "" || path == "index" {
		return ""
	}
	return path
}
