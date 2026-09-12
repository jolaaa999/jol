package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jol/blog/api/_lib"
)

// Handler — GET /api/rss — Atom/RSS 2.0 feed
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

	articles := lib.ArticlesByCategory(lib.CategoryReflection)
	siteURL := "https://jol.vercel.app"

	w.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
	w.WriteHeader(http.StatusOK)

	fmt.Fprintf(w, `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>JOL Blog</title>
<link>%s/blog</link>
<description>Reflections on design, animation, and engineering.</description>
<language>zh-CN</language>
<lastBuildDate>%s</lastBuildDate>
`, siteURL, time.Now().Format(time.RFC1123Z))

	for _, a := range articles {
		link := fmt.Sprintf("%s/blog/post/%s", siteURL, a.ID)
		desc := a.Content
		if len(desc) > 200 {
			desc = desc[:200] + "..."
		}
		fmt.Fprintf(w, `<item>
<title>%s</title>
<link>%s</link>
<guid>%s</guid>
<pubDate>%s</pubDate>
<description>%s</description>
</item>
`, escapeXML(a.Title), link, link, a.CreatedAt.Format(time.RFC1123Z), escapeXML(desc))
	}

	fmt.Fprint(w, "</channel></rss>")
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}
