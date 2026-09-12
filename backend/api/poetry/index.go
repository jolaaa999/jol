package handler

import (
	"net/http"

	"github.com/jol/blog/api/_lib"
)

// Handler — GET /api/poetry
// 返回 Category 为「诗文」的文章列表
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.ServeArticleList(w, r, lib.CategoryPoetry)
}
