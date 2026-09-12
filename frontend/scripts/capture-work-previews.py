"""Capture live demo screenshots for work archive previews."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "works" / "previews"
GITHUB_USER = "jolaaa999"
EXCLUDED = {"jolaaa999", "VSCode", "lunwen", "flower", "FK-valorant"}

# repo name -> demo URL overrides when GitHub homepage is missing
FALLBACK_DEMOS: dict[str, str] = {
    "TankTrouble": "https://tank-trouble-ten.vercel.app",
    "Delicious": "https://delicious-bay.vercel.app",
    "tfmy": "https://tfmy.vercel.app",
    "SavePic": "https://save-pic.vercel.app",
    "jol": "https://jol-ten.vercel.app/entry",
}


def fetch_repos() -> list[dict]:
    url = f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&sort=updated"
    req = urllib.request.Request(url, headers={"User-Agent": "jol-preview-capture"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode())


def demo_url(repo: dict) -> str | None:
    homepage = (repo.get("homepage") or "").strip()
    if homepage:
        return homepage
    return FALLBACK_DEMOS.get(repo["name"])


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    repos = [
        r
        for r in fetch_repos()
        if not r.get("fork")
        and not r.get("archived")
        and r.get("name") not in EXCLUDED
    ]

    targets: list[tuple[str, str]] = []
    for repo in repos:
        url = demo_url(repo)
        if not url:
            print(f"skip {repo['name']}: no demo URL")
            continue
        work_id = repo["name"].lower()
        targets.append((work_id, url))

    print(f"Capturing {len(targets)} previews -> {OUT_DIR}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2,
            color_scheme="dark",
        )
        page = context.new_page()

        for work_id, url in targets:
            out = OUT_DIR / f"{work_id}.webp"
            print(f"  {work_id}: {url}")
            try:
                page.goto(url, wait_until="networkidle", timeout=60_000)
                page.wait_for_timeout(1200)
                page.screenshot(path=str(out), type="webp", quality=82)
                print(f"    -> {out.name}")
            except Exception as exc:  # noqa: BLE001
                print(f"    !! failed: {exc}")

        browser.close()

    print("done")


if __name__ == "__main__":
    main()
