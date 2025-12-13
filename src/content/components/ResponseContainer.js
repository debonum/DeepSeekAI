import PerfectScrollbar from 'perfect-scrollbar';

export function styleResponseContainer(container) {
  container.id = "ai-response-container";
  Object.assign(container.style, {
    flex: "1",
    minHeight: "0",
    position: "relative",
    marginBottom: "60px",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "20px 10px",
    paddingBottom: "60px",
    boxSizing: "border-box",
    userSelect: "text",
    "-webkit-user-select": "text",
    "-moz-user-select": "text",
    "-ms-user-select": "text",
  });

  return container;
}
