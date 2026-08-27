package handler

import (
	"net/http"
	"strings"

	"github.com/jol/blog/api/_lib"
)

// Handler — GET /api/posts/[id]
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.SetCORS(w)
	if lib.HandleOptions(w, r) {
		return
	}

	// Vercel passes path suffix after /api/posts/
	path := strings.TrimPrefix(r.URL.Path, "/api/posts/")
	path = strings.Trim(path, "/")
	if path == "" || path == "index" {
		lib.WriteJSON(w, http.StatusBadRequest, lib.ErrorResponse{
			Error:   "missing_id",
			Message: "article id required",
		})
		return
	}

	lib.ServeArticleDetail(w, r, path)
}
