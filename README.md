# DansuWeb

서버에서 빌드한 파일을 기존 Nginx가 `/admin/`으로 제공합니다.

## 배포

어드민 페이지의 경우엔
`apps/admin`에서 빌드합니다.

```bash
npm ci
npm run build
```

Nginx의 `/admin/` 경로가 빌드 결과인 `apps/admin/dist/`를 가리키도록 설정합니다.
실제 서버 경로에 맞게 `alias`를 수정하세요.

```nginx
location /admin/ {
    alias /path/to/projects/DansuWEB/apps/admin/dist/;
    try_files $uri $uri/ /admin/index.html;
}
```

기존 `/api/`, `/res/`는 DansuAPI로 전달하고, Steam 콜백 주소는 API 설정에서 운영 도메인으로 지정합니다.
