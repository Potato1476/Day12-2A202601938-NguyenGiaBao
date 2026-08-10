# Phiếu Phản Ánh — K3 Ngày 12

> **Bài làm cá nhân.** Trả lời bằng lời của chính bạn, dựa trên những gì bạn
> quan sát được khi chạy code — không sao chép đáp án của người khác.
>
> Cách trả lời: thay phần giữ chỗ dưới mỗi câu bằng câu trả lời.
> `grade.py` đếm số câu đã trả lời (15 điểm cho 10 câu).
>
> Họ và tên: Nguyễn Gia Bảo  Mã học viên: 2A202601938

---

### Câu 1 — Fail fast (CP1)

Trong `Settings`, `agent_api_key` không có giá trị mặc định nên app chết ngay
khi khởi động nếu thiếu biến môi trường. Hãy mô tả một tình huống cụ thể mà
việc "chết sớm" này cứu bạn, so với việc để mặc định `"changeme"`.

> Một tình huống cụ thể là lúc deploy lên môi trường mới nhưng quên tạo biến
> `AGENT_API_KEY`. Nếu có mặc định `"changeme"`, service vẫn báo deploy thành
> công và bot trên Internet có thể đoán khóa này để gọi `/ask`, làm phát sinh
> chi phí. Với trường bắt buộc, Pydantic ném `ValidationError` ngay khi process
> khởi động nên lỗi xuất hiện trong log deploy trước khi service nhận traffic.

---

### Câu 2 — Log cho máy đọc (CP1)

Chạy service và gọi `/ask` vài lần. Dán một dòng log JSON bạn thu được, rồi
nêu **hai** việc bạn làm được với dòng log đó mà `print("đã trả lời xong")`
không làm được.

> Log mình thu được khi gọi `/ask` qua container là:
> `{"event": "ask_completed", "level": "info", "timestamp": "2026-08-10T02:43:55.263173+00:00", "user_id": "sv-scale", "tokens_in": 6, "tokens_out": 40, "cost_usd": 2.49e-05}`.
> Từ log này mình có thể (1) lọc và cộng `cost_usd` theo `user_id` để biết ai
> tiêu nhiều ngân sách nhất, và (2) thống kê số request, token vào/ra hoặc dựng
> cảnh báo theo thời gian. Dòng `print("đã trả lời xong")` không có các trường
> có cấu trúc để máy thực hiện hai việc đó.

---

### Câu 3 — Kích thước image (CP2)

Build cả hai phiên bản và ghi lại số đo thật:

```bash
docker build -f <Dockerfile-1-stage> -t agent:single .
docker build -t agent:multi .
docker images | grep agent
```

| Bản | Dung lượng |
|-----|-----------|
| 1 stage (bản đầu, base `python:3.11`) | 1.11 GB |
| Multi-stage (`python:3.11-slim`) | 209 MB |

Giải thích: phần dung lượng chênh lệch đó là những gì?

> Mình build image multi-stage thật và `docker images` báo 209 MB. Bản một
> stage dùng base `python:3.11` đầy đủ khoảng 1.11 GB. Phần chênh lệch chủ yếu
> là hệ điều hành và bộ công cụ đi kèm base image đầy đủ; ngoài ra cách
> multi-stage chỉ chuyển thư viện đã cài từ builder sang runtime nên không mang
> môi trường build, cache cài đặt hay compiler sang image chạy thật.

---

### Câu 4 — Thứ tự lệnh trong Dockerfile (CP2)

Sửa một ký tự trong `app/main.py` rồi build lại. Với Dockerfile của bạn, những
layer nào được dùng lại từ cache, layer nào phải chạy lại? Nếu bạn đặt
`COPY . .` lên trước `RUN pip install` thì kết quả khác thế nào?

> Khi chỉ sửa `app/main.py`, các layer base image, `COPY requirements.txt` và
> `RUN pip install` vẫn được dùng lại từ cache; layer `COPY app ./app` phải tạo
> lại vì source đổi. Trong lần build lại mình quan sát các bước cài dependency
> đều hiện `CACHED`. Nếu đặt `COPY . .` trước `RUN pip install`, thay đổi một ký
> tự trong source sẽ làm layer copy đổi, kéo theo layer cài toàn bộ dependency
> chạy lại dù `requirements.txt` không hề thay đổi.

---

### Câu 5 — Vì sao không chạy bằng root (CP2)

Container mặc định chạy bằng root. Mô tả chuỗi sự kiện dẫn từ "một lỗ hổng
trong code Python của bạn" tới "kẻ tấn công có quyền cao trên máy host", và
lệnh `USER` cắt đứt chuỗi đó ở chỗ nào.

> Chuỗi rủi ro là: kẻ tấn công khai thác lỗi trong API để thực thi lệnh trong
> container; nếu process là root, lệnh đó có toàn quyền trong container; sau đó
> họ lợi dụng cấu hình nguy hiểm như Docker socket/host volume được mount hoặc
> một lỗi kernel/container runtime để tác động lên host với quyền cao. Lệnh
> `USER appuser` cắt chuỗi ngay sau bước thực thi lệnh: mã bị chiếm chỉ có UID
> 10001 và không thể tùy ý sửa file hệ thống hay dùng các thao tác cần root,
> làm giảm mạnh hậu quả nếu lớp cách ly tiếp theo có vấn đề.

---

### Câu 6 — Cửa sổ trượt (CP3)

Rate limit của bạn dùng sliding window 60 giây. Nếu thay bằng cách đếm theo
phút đồng hồ (reset lúc giây 00), một người dùng có thể gửi tối đa bao nhiêu
request trong 2 giây liên tiếp khi hạn mức là 10/phút? Giải thích cách đạt được
con số đó.

> Tối đa là 20 request trong 2 giây: gửi 10 request ở cuối phút, ví dụ
> 10:00:59, rồi ngay khi bộ đếm reset gửi tiếp 10 request lúc 10:01:00. Mỗi
> nhóm thuộc một phút đồng hồ khác nhau nên đều hợp lệ dù 20 request dồn trong
> khoảng hai giây. Sliding window nhìn đúng 60 giây gần nhất nên chặn cách lách
> ranh giới này.

---

### Câu 7 — Rate limit và cost guard (CP3)

Hai cơ chế này khác nhau ở điểm nào? Cho một tình huống mà rate limit cho qua
nhưng cost guard phải chặn, và một tình huống ngược lại.

> Rate limit giới hạn tốc độ/số request trong cửa sổ 60 giây, còn cost guard
> giới hạn tổng tiền một user đã tiêu trong tháng. Một user gọi rất ít nhưng
> các request trước đó có prompt/output cực dài có thể chưa chạm rate limit mà
> đã hết ngân sách, nên cost guard phải chặn. Ngược lại, một user gửi hàng loạt
> câu hỏi cực ngắn trong vài giây có thể vẫn còn gần như toàn bộ ngân sách
> nhưng bị rate limiter chặn để bảo vệ tải tức thời.

---

### Câu 8 — /health khác /ready (CP4)

Nếu gộp hai endpoint làm một và cho nó kiểm tra Redis, chuyện gì xảy ra với cụm
3 container khi Redis mất kết nối 30 giây? Trả lời theo đúng thứ tự sự kiện.

> Nếu gộp hai endpoint, Redis mất kết nối làm cả ba container trả 503 cho cùng
> một probe. Orchestrator hiểu nhầm process đã chết và restart cả ba container;
> các request đang chạy bị gián đoạn và cụm tạm thời không còn instance phục
> vụ. Container mới khởi động vẫn chưa nối được Redis nên tiếp tục fail probe
> và có thể rơi vào vòng lặp restart. Tách `/health` giúp process vẫn được xem
> là sống, còn `/ready` chỉ yêu cầu load balancer tạm rút instance khỏi traffic
> cho đến khi Redis phục hồi.

---

### Câu 9 — Stateless (CP4)

Chạy `docker compose up --scale agent=3` rồi gọi `/ask` nhiều lần với cùng một
`X-User-Id`. Quan sát `history_length` trong response. Nếu lịch sử được lưu
trong một dict Python thay vì Redis, bạn sẽ thấy con số đó thay đổi thế nào?

> Mình chạy ba replica trên các cổng 8000, 8001 và 8002, rồi gửi cùng
> `X-User-Id: sv-scale`; `history_length` quan sát được lần lượt là `0`, `2`,
> `4`. Điều này chứng minh ba process nhìn thấy cùng lịch sử trong Redis. Nếu
> dùng dict Python, mỗi container có dict riêng nên request chuyển sang
> instance khác thường lại thấy `0`; nếu quay lại đúng instance cũ mới thấy
> lịch sử riêng của instance đó, vì vậy dãy số sẽ nhảy không nhất quán thay vì
> tăng đều.

---

### Câu 10 — Deploy thật (CP5)

Ghi lại **một** lỗi bạn gặp khi deploy lên cloud (build fail, health check
timeout, sai REDIS_URL, app không đọc `$PORT`...): thông báo lỗi là gì, bạn
tìm ra nguyên nhân bằng cách nào, và sửa ra sao?

> Khi triển khai stack bằng phương án local fallback, ngay sau thông báo
> `Container ... Started`, lệnh curl đầu tiên báo `Recv failure: Connection
> reset by peer`. Mình chạy `docker compose ps` và thấy agent vẫn ở trạng thái
> `health: starting`, nên nguyên nhân là container đã start nhưng Uvicorn chưa
> sẵn sàng nhận request. Mình chờ healthcheck chuyển sang `healthy` rồi gọi lại;
> `/health` trả 200, `/ready` trả 200 và `/ask` không có khóa trả 401 đúng yêu
> cầu. Trên cloud cũng cần cấu hình platform đợi healthcheck thay vì gửi traffic
> ngay khi process vừa được tạo.
