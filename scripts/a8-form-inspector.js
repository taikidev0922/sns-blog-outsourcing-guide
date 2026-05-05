(() => {
  const fields = [...document.querySelectorAll("input, textarea, select, button")].map((element, index) => {
    const row = element.closest("tr, .form-group, .formBox, dl, li, section, div");
    const nearbyText = row?.innerText?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "";
    return {
      index,
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || "",
      name: element.getAttribute("name") || "",
      id: element.id || "",
      value: element.value || "",
      text: element.innerText?.replace(/\s+/g, " ").trim().slice(0, 120) || "",
      nearbyText,
    };
  });

  const forms = [...document.forms].map((form, index) => ({
    index,
    action: form.action,
    method: form.method,
    id: form.id || "",
    name: form.getAttribute("name") || "",
    text: form.innerText?.replace(/\s+/g, " ").trim().slice(0, 500) || "",
  }));

  const result = {
    page: {
      title: document.title,
      url: location.href,
    },
    forms,
    fields,
  };

  const text = JSON.stringify(result, null, 2);
  navigator.clipboard.writeText(text).then(
    () => console.log("A8 form metadata copied to clipboard.", result),
    () => console.log("A8 form metadata:", result),
  );
})();
