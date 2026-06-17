package lib

import (
	"net/http"
	"time"
)

// Category 文章分类
type Category string

const (
	CategoryReflection Category = "有感"
	CategoryPoetry     Category = "诗文"
)

// Article 文章实体
type Article struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Category  Category  `json:"category"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// ListResponse 列表接口统一响应
type ListResponse struct {
	Data     []Article `json:"data"`
	Total    int       `json:"total"`
	Category Category  `json:"category"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

var mockArticles = []Article{
	{
		ID:        "p-001",
		Title:     "静夜",
		Category:  CategoryPoetry,
		Content:   "月色落在窗棂上，\n像一段未完成的代码，\n等待被编译成梦。",
		CreatedAt: time.Date(2026, 5, 12, 20, 0, 0, 0, time.UTC),
	},
	{
		ID:        "p-002",
		Title:     "风过草原",
		Category:  CategoryPoetry,
		Content:   "蒲公英解体的那一秒，\n整片草原都在悄悄重写自己的坐标系。",
		CreatedAt: time.Date(2026, 4, 28, 9, 30, 0, 0, time.UTC),
	},
	{
		ID:        "p-003",
		Title:     "拓扑",
		Category:  CategoryPoetry,
		Content:   "节点与边构成世界，\n我们在毛玻璃后面，\n阅读自己的连接度。",
		CreatedAt: time.Date(2026, 3, 15, 14, 15, 0, 0, time.UTC),
	},
	{
		ID:        "r-001",
		Title:     "关于克制",
		Category:  CategoryReflection,
		Content:   "好的界面像好的诗——每个元素都有存在的理由，其余皆是噪声。",
		CreatedAt: time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC),
	},
	{
		ID:        "r-002",
		Title:     "物理与感知",
		Category:  CategoryReflection,
		Content:   "Verlet 积分教会我：平滑的动画不是插值出来的，而是被力推导出来的。",
		CreatedAt: time.Date(2026, 5, 20, 16, 45, 0, 0, time.UTC),
	},
	{
		ID:        "r-003",
		Title:     "终末地的灰",
		Category:  CategoryReflection,
		Content:   "暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。",
		CreatedAt: time.Date(2026, 5, 8, 11, 20, 0, 0, time.UTC),
	},
	{
		ID:        "r-004",
		Title:     "基建完成",
		Category:  CategoryReflection,
		Content:   "Vue3 + Go Serverless 同源部署脚手架已就绪。",
		CreatedAt: time.Date(2026, 6, 17, 8, 0, 0, 0, time.UTC),
	},
}

// ArticlesByCategory 按分类筛选文章（返回副本，避免外部修改）
func ArticlesByCategory(category Category) []Article {
	result := make([]Article, 0)
	for _, a := range mockArticles {
		if a.Category == category {
			result = append(result, a)
		}
	}
	return result
}

// ServeArticleList 处理文章列表 GET 请求
func ServeArticleList(w http.ResponseWriter, r *http.Request, category Category) {
	SetCORS(w)
	if HandleOptions(w, r) {
		return
	}

	if r.Method != http.MethodGet {
		WriteJSON(w, http.StatusMethodNotAllowed, ErrorResponse{
			Error:   "method_not_allowed",
			Message: "only GET is supported",
		})
		return
	}

	articles := ArticlesByCategory(category)
	WriteJSON(w, http.StatusOK, ListResponse{
		Data:     articles,
		Total:    len(articles),
		Category: category,
	})
}
