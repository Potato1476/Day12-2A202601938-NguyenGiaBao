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
const probeMessage = document.querySelector("#probe-message");
const refreshButton = document.querySelector("#refresh-status");

function setLoading() {
  panel?.setAttribute("aria-busy", "true");
  [healthStatus, readyStatus].forEach((element) => {
    if (!element) return;
    element.textContent = "Đang kiểm tra";
    element.className = "probe-status is-loading";
  });
  if (probeMessage) probeMessage.textContent = "Đang kết nối tới service...";
  if (refreshButton) refreshButton.disabled = true;
}

function setProbeResult(element, response, data) {
  if (!element) return;
  const successful = response.ok;
  element.textContent = successful
    ? `${response.status} ${data.status}`
    : `${response.status} ${data.status || "error"}`;
  element.className = successful ? "probe-status" : "probe-status is-error";
}

async function checkService() {
  setLoading();
  try {
    const [healthResponse, readyResponse] = await Promise.all([
      fetch("/health", { cache: "no-store" }),
      fetch("/ready", { cache: "no-store" }),
    ]);
    const [healthData, readyData] = await Promise.all([
      healthResponse.json(),
      readyResponse.json(),
    ]);
    setProbeResult(healthStatus, healthResponse, healthData);
    setProbeResult(readyStatus, readyResponse, readyData);
    if (probeMessage) {
      probeMessage.textContent = healthResponse.ok && readyResponse.ok
        ? "Process và Redis đang sẵn sàng nhận traffic."
        : "Service phản hồi nhưng chưa sẵn sàng. Kiểm tra Redis và lifecycle.";
    }
  } catch (error) {
    [healthStatus, readyStatus].forEach((element) => {
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
