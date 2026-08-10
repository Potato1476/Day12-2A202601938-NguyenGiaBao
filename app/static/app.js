document.documentElement.classList.add("js");

const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
  window.setTimeout(() => {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }, 900);
}

const panel = document.querySelector(".service-panel");
const healthStatus = document.querySelector("#health-status");
const readyStatus = document.querySelector("#ready-status");
const askStatus = document.querySelector("#ask-status");
const probeMessage = document.querySelector("#probe-message");
const refreshButton = document.querySelector("#refresh-status");
const probeStatuses = [healthStatus, readyStatus, askStatus];

function setLoading() {
  panel?.setAttribute("aria-busy", "true");
  probeStatuses.forEach((element) => {
    if (!element) return;
    element.textContent = "Đang kiểm tra";
    element.className = "probe-status is-loading";
  });
  if (probeMessage) probeMessage.textContent = "Đang kết nối tới service...";
  if (refreshButton) refreshButton.disabled = true;
}

function setProbeResult(element, result, isExpected) {
  if (!element) return;
  if (!result.connected) {
    element.textContent = "Không kết nối";
    element.className = "probe-status is-error";
    return;
  }

  const label = result.data?.status
    || (result.status === 401 ? "protected" : "error");
  element.textContent = `${result.status} ${label}`;
  element.className = isExpected(result.status)
    ? "probe-status"
    : "probe-status is-error";
}

async function requestProbe(url, options = {}) {
  try {
    const response = await fetch(url, { cache: "no-store", ...options });
    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (_error) {
        data = null;
      }
    }
    return { connected: true, status: response.status, data };
  } catch (error) {
    return { connected: false, status: 0, data: null };
  }
}

async function checkService() {
  setLoading();
  try {
    const [healthResult, readyResult, askResult] = await Promise.all([
      requestProbe("/health"),
      requestProbe("/ready"),
      requestProbe("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "health probe" }),
      }),
    ]);

    setProbeResult(healthStatus, healthResult, (status) => status === 200);
    setProbeResult(readyStatus, readyResult, (status) => status === 200);
    setProbeResult(askStatus, askResult, (status) => status === 401);

    if (probeMessage) {
      if (!healthResult.connected) {
        probeMessage.textContent = "Không thể gọi service. Hãy thử lại sau khi deployment khởi động.";
      } else if (healthResult.status !== 200) {
        probeMessage.textContent = "Process đang phản hồi lỗi. Kiểm tra deployment logs.";
      } else if (readyResult.status !== 200) {
        probeMessage.textContent = "Process đang sống nhưng Redis hoặc cấu hình runtime chưa sẵn sàng.";
      } else if (askResult.status !== 401) {
        probeMessage.textContent = "Redis đã sẵn sàng nhưng lớp xác thực API đang phản hồi sai.";
      } else {
        probeMessage.textContent = "Process, Redis và lớp xác thực đang sẵn sàng nhận traffic.";
      }
    }
  } catch (error) {
    probeStatuses.forEach((element) => {
      if (!element) return;
      element.textContent = "Không kết nối";
      element.className = "probe-status is-error";
    });
    if (probeMessage) probeMessage.textContent = "Không thể gọi probe. Hãy tải lại trang sau khi service khởi động.";
  } finally {
    panel?.setAttribute("aria-busy", "false");
    if (refreshButton) refreshButton.disabled = false;
  }
}

refreshButton?.addEventListener("click", checkService);
checkService();

const copyButton = document.querySelector("#copy-command");
copyButton?.addEventListener("click", async () => {
  const command = document.querySelector("#grade-command")?.textContent || "python grade.py";
  try {
    await navigator.clipboard.writeText(command);
    copyButton.textContent = "Đã sao chép";
  } catch (error) {
    copyButton.textContent = "Không thể sao chép";
  }
  window.setTimeout(() => {
    copyButton.textContent = "Sao chép lệnh";
  }, 1800);
});
