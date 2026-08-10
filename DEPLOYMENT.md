# Thông Tin Deploy — Checkpoint 5

> Điền file này sau khi deploy xong. `pytest tests/test_cp5.py` đọc file này
> để tìm địa chỉ service của bạn và gọi thử.
>
> **Chỉ ghi TÊN biến môi trường, tuyệt đối không dán giá trị API key vào đây.**
> Repo này công khai — dán khóa vào là mất khóa.

## Thông Tin Học Viên

| Mục | Nội dung |
|-----|----------|
| Họ và tên | Nguyễn Gia Bảo |
| Mã học viên | 2A202601938 |
| Repo | https://github.com/Potato1476/Day12-2A202601938-NguyenGiaBao |

## Service

| Mục | Nội dung |
|-----|----------|
| Public URL | Không có — dùng local fallback tại `http://localhost:8000` |
| Platform | Render dự kiến; hiện kiểm chứng bằng Docker Compose local fallback |
| Ngày deploy | 2026-08-10 |

## Biến Môi Trường Đã Cấu Hình

Ghi tên biến và **nguồn giá trị**, không ghi giá trị:

| Biến | Đã set | Ghi chú |
|------|--------|---------|
| `PORT` | ✅ | 8000 trong local fallback; cloud sẽ tự gán |
| `AGENT_API_KEY` | ✅ | đặt trong file `.env` không được commit; không ghi giá trị tại đây |
| `REDIS_URL` | ✅ | Redis service của Docker Compose; khi lên Render dùng Redis add-on |
| `RATE_LIMIT_PER_MINUTE` | ✅ | 10 |
| `MONTHLY_BUDGET_USD` | ✅ | 10.0 |
| `LOG_LEVEL` | ✅ | INFO |

## Lệnh Kiểm Tra

Trong lần kiểm chứng local fallback, URL được thay bằng `http://localhost:8000`:

```bash
# 1. Liveness — mong đợi 200 {"status":"ok"}
curl -i http://localhost:8000/health

# 2. Readiness — mong đợi 200 {"status":"ready"} (đã nối được Redis)
curl -i http://localhost:8000/ready

# 3. Không có API key — mong đợi 401
curl -i -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello"}'

# 4. Có API key — mong đợi 200 kèm câu trả lời
curl -i -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AGENT_API_KEY" \
  -H "X-User-Id: sv-test" \
  -d '{"question":"Deploy là gì?"}'

# 5. Rate limit — gọi 15 lần, những lần cuối phải trả 429
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:8000/ask \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $AGENT_API_KEY" \
    -H "X-User-Id: sv-test" \
    -d '{"question":"test"}'
done; echo
```

## Kết Quả Chạy Thật

Dán output của các lệnh trên vào đây:

```
GET /health  -> HTTP/1.1 200 OK
{"status":"ok","service":"day12-agent","version":"1.0.0"}

GET /ready   -> HTTP/1.1 200 OK
{"status":"ready","redis":true}

POST /ask không có X-API-Key -> HTTP/1.1 401 Unauthorized
{"detail":"invalid or missing API key"}

POST /ask có API key -> HTTP/1.1 200 OK
{"user_id":"sv-test","history_length":0,"cost_usd":2.145e-05,"tokens":{"in":3,"out":35}}

Rate limit 15 lần (user riêng cho phép đo):
200 200 200 200 200 200 200 200 200 200 429 429 429 429 429
```

## Ảnh Chụp Màn Hình

Đặt ảnh trong thư mục `screenshots/`:

- `screenshots/health.png` — kết quả thật khi gọi `/health` của local fallback

---

## Nếu Dùng Phương Án Dự Phòng

Không đăng ký được tài khoản cloud? Vẫn nộp được bài, nhưng CP5 tối đa 60% điểm:

1. Đặt `LOCAL_FALLBACK=true` trong `.env`
2. Chạy `docker compose up -d` rồi kiểm tra `docker compose ps`
3. Chụp màn hình vào `screenshots/`
4. Chạy `pytest tests/test_cp5.py -v` — bộ test sẽ tự chuyển sang kiểm tra
   `http://localhost:8000`
5. Ghi rõ lý do không deploy được vào phần dưới đây:

Lý do dùng phương án dự phòng: môi trường làm bài hiện không có Railway CLI,
Render session hoặc token đăng nhập cloud được cấu hình. Toàn bộ stack đã được
build và kiểm chứng bằng Docker Compose với ba agent replica và một Redis dùng
chung. Khi có quyền đăng nhập platform, có thể deploy cùng Dockerfile mà không
cần thay đổi source code.
