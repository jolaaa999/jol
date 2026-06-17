package handler

import (
	"net/http"

	"github.com/jol/blog/api/_lib"
)

// Handler — GET /api/posts
// 返回 Category 为「有感」的文章列表
func Handler(w http.ResponseWriter, r *http.Request) {
	lib.ServeArticleList(w, r, lib.CategoryReflection)
}
