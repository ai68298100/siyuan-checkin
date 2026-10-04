import {t} from "../i18n";
import {matchesSearch} from "../shared";

const selector = "[data-sireader-item],[data-siplayer-item],[data-weread-item],[data-weread-finish-item],[data-weread-notes-item],[data-health-binding-item],[data-note-query-item]";
const boundChoices = new WeakSet<HTMLSelectElement>();
const queries = new WeakMap<HTMLElement, Map<string, string>>();

export function bindProjectChoices(root: HTMLElement): void {
    const savedQueries = queries.get(root) || new Map<string, string>();
    queries.set(root, savedQueries);
    root.querySelectorAll<HTMLSelectElement>(selector).forEach((select, index) => {
        if (boundChoices.has(select)) return;
        boundChoices.add(select);
        const key = select.getAttributeNames().find(attribute => attribute.startsWith("data-")) || String(index);
        const queryKey = `${key}:${key === "data-health-binding-item" ? index : ""}`;
        const wrapper = document.createElement("span");
        wrapper.className = "lc-checkin__project-choice";
        const search = document.createElement("input");
        search.type = "search";
        search.setAttribute("data-project-choice-search", key);
        search.setAttribute("aria-label", `${t("set.projectSearch")} · ${select.getAttribute("aria-label") || ""}`);
        search.placeholder = t("set.projectSearch");
        search.autocomplete = "off";
        search.value = savedQueries.get(queryKey) || "";
        const count = document.createElement("small");
        count.setAttribute("data-project-choice-count", "");
        const allOptions = [...select.options].map(option => option.cloneNode(true) as HTMLOptionElement);
        let composing = false;
        const applySearch = () => {
            const selectedId = select.value;
            savedQueries.set(queryKey, search.value);
            const matching = allOptions.filter(option => !option.value || matchesSearch(`${option.textContent || ""} ${option.value}`, search.value));
            const selected = allOptions.find(option => option.value === selectedId);
            if (selected && !matching.includes(selected)) matching.push(selected);
            select.replaceChildren(...matching.map(option => option.cloneNode(true)));
            select.value = selectedId;
            count.textContent = t("set.projectMatches", {n: matching.filter(option => option.value && matchesSearch(`${option.textContent || ""} ${option.value}`, search.value)).length});
        };
        search.addEventListener("compositionstart", () => { composing = true; });
        search.addEventListener("compositionend", () => { composing = false; applySearch(); });
        search.addEventListener("input", () => { if (!composing) applySearch(); });
        select.addEventListener("change", applySearch);
        select.replaceWith(wrapper);
        wrapper.append(search, select, count);
        applySearch();
    });
}
