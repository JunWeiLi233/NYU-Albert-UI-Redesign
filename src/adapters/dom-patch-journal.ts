interface AttributePatch {
  element: Element;
  name: string;
  previousValue: string | null;
}

export class DomPatchJournal {
  private readonly attributePatches: AttributePatch[] = [];
  private rolledBack = false;

  setAttribute(element: Element, name: string, value = ""): void {
    if (this.rolledBack) {
      throw new Error("Cannot apply a DOM patch after rollback.");
    }

    this.attributePatches.push({
      element,
      name,
      previousValue: element.getAttribute(name),
    });
    element.setAttribute(name, value);
  }

  rollback(): void {
    if (this.rolledBack) {
      return;
    }
    this.rolledBack = true;

    for (const patch of [...this.attributePatches].reverse()) {
      if (patch.previousValue === null) {
        patch.element.removeAttribute(patch.name);
      } else {
        patch.element.setAttribute(patch.name, patch.previousValue);
      }
    }
    this.attributePatches.length = 0;
  }
}

