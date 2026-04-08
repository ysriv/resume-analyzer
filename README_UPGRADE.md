# Resume Analyzer Upgrade Batch

This bundle adds:
- Docker Compose orchestration
- PostgreSQL service
- backend/frontend Dockerfiles
- health and readiness endpoints
- PDF layout analysis heuristics for ATS risk detection
- patch files showing where to merge changes into your existing codebase

## Quick start
1. Copy these files into your existing `resume-analyzer/` project.
2. Merge the `*.patch.py` guidance into the corresponding Python files.
3. Ensure your backend `requirements.txt` includes `psycopg2-binary`.
4. Run from project root:

```bash
docker compose up --build
```

## URLs
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs
- Health: http://localhost:8000/ops/health
- Ready: http://localhost:8000/ops/ready

## Notes
- The docker backend uses PostgreSQL by default via `backend/.env.docker`.
- The layout analyzer is heuristic-based; it is useful for ATS risk flags but not a full visual parser.
- If your frontend package manager uses `pnpm` or `yarn`, adjust `frontend/Dockerfile` accordingly.
