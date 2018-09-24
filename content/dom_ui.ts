interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}
declare var browser: never;

VDom.UI = {
  box: null,
  styleIn: null,
  styleOut: null,
  root: null as never,
  callback: null,
  flashLastingTime: 400,
  addElement<T extends HTMLElement> (this: DomUI, element: T, adjust?: AdjustType): T {
    const box = this.box = VDom.createElement("div"),
    shadowVer = typeof box.attachShadow === "function" ? 2 : typeof box.createShadowRoot === "function" ? 1 : 0;
    box.style.display = "none";
    this.root = shadowVer === 2 ? (box as AttachShadow).attachShadow({mode: "closed"})
      : shadowVer === 1 ? (box as any).createShadowRoot() as ShadowRoot : box;
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    this.root.mode === "closed" || (this.root !== box ? this.root as ShadowRoot : window).addEventListener("load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!VDom) { return window.removeEventListener("load", Onload, true); }
      const t = e.target as HTMLElement;
      if (t.parentNode === VDom.UI.root) {
        VUtils.Stop(e); t.onload && t.onload(e);
      }
    }, true);
    this.addElement = function<T extends HTMLElement>(this: DomUI, element: T, adjust?: AdjustType, before?: Element | null | true): T {
      adjust === AdjustType.NotAdjust || this.adjust();
      return this.root.insertBefore(element, before === true ? this.root.firstElementChild : before || null);
    };
    this.css = (function (innerCSS): void {
      if (this.box === this.root) {
        (this.box as HTMLElement).id = "VimiumUI";
      }
      let el: HTMLStyleElement | null = this.styleIn = this.createStyle(innerCSS), el2: HTMLStyleElement | null;
      this.root.appendChild(el);
      this.css = function(css) { (this.styleIn as HTMLStyleElement).textContent = css; };
      (el2 = this._styleBorder) && this.root.appendChild(el2);
      if (adjust !== AdjustType.AdjustButNotShow) {
        let f = function (this: HTMLElement, e: Event | 1): void {
          e !== 1 && (this.onload = null as never);
          const a = VDom.UI, box = a.box as HTMLElement;
          // enforce webkit to build the style attribute node, and then we can remove it totally
          box.hasAttribute("style") && box.removeAttribute("style");
          a.callback && a.callback();
        };
        VDom.isStandard ? Promise.resolve(1 as 1).then(f) : (el.onload = f);
      }
      if (adjust !== AdjustType.NotAdjust) {
        return this.adjust();
      }
    });
    this.root.appendChild(element);
    let a: string | null;
    if (a = this.styleIn as string | null) {
      this.css(a);
    } else {
      a === "" || VPort.post({ handler: "css" });
      if ((adjust as AdjustType) >= AdjustType.MustAdjust) {
        this.adjust();
      }
    }
    return element;
  },
  addElementList (els, offset: ViewOffset): HTMLDivElement {
    const parent = VDom.createElement("div");
    parent.className = "R HM";
    for (const el of els) {
      parent.appendChild(el.marker);
    }
    const style = parent.style, zoom = VDom.bZoom / VDom.dScale;
    style.left = offset[0] + "px"; style.top = offset[1] + "px";
    zoom !== 1 && (style.zoom = "" + zoom);
    document.webkitIsFullScreen && (style.position = "fixed");
    return this.addElement(parent, AdjustType.DEFAULT, this._lastFlash);
  },
  adjust (event): void {
    const ui = VDom.UI, el = document.webkitFullscreenElement,
    el2 = el && !(ui.root as Node).contains(el) ? el : document.documentElement as HTMLElement;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    el2 !== (ui.box as HTMLElement).parentNode && (ui.box as Node).appendChild.call(el2, ui.box as Node);
    let sin = ui.styleIn, s = sin && (sin as HTMLStyleElement).sheet;
    s && (s.disabled = false);
    (el || event) && (el ? addEventListener : removeEventListener)("webkitfullscreenchange", ui.adjust, true);
  },
  toggle (enabled): void {
    if (enabled) { return this.adjust(); }
    (this.box as HTMLElement).remove();
    removeEventListener("webkitfullscreenchange", this.adjust, true);
  },
  _styleBorder: null as (HTMLStyleElement & {vZoom?: number}) | null,
  ensureBorder (zoom?: number): void {
    let st = this._styleBorder, first = !st;
    zoom || (zoom = VDom.getZoom());
    if (first ? zoom >= 1 : (st as HTMLStyleElement & {vZoom?: number}).vZoom === zoom) { return; }
    st = st || (this._styleBorder = this.createStyle(""));
    const p = this.box === this.root ? "#VimiumUI " : "";
    st.vZoom = zoom; st.textContent = `${p}.HUD, ${p}.IH, ${p}.LH { border-width: ${("" + 0.51 / zoom).substring(0, 5)}px; }`;
    first && this.box && this.addElement(st, AdjustType.NotAdjust);
  },
  createStyle (text, doc): HTMLStyleElement {
    const css = (doc || VDom).createElement("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  css (innerCSS): void { this.styleIn = innerCSS; },
  getDocSelectable (): boolean {
    let el: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = this.styleOut, st: CSSStyleDeclaration;
    if (el && el.parentNode) { return false; }
    if (el = document.body) {
      st = getComputedStyle(el);
      if ((st.userSelect || st.webkitUserSelect) === "none") {
        return false;
      }
    }
    st = getComputedStyle(document.documentElement as HTMLHtmlElement);
    return (st.userSelect || st.webkitUserSelect) !== "none";
  },
  toggleSelectStyle (enable: boolean): void {
    let el = this.styleOut;
    if (enable ? VDom.docSelectable : !el || !el.parentNode) { return; }
    el || (this.styleOut = el = this.createStyle(
      "html, body, * { -webkit-user-select: auto; user-select: auto; }"
    ));
    enable ? (this.box as HTMLElement).appendChild(el) : el.remove();
  },
  getSelection (): Selection {
    let sel = window.getSelection(), el: Node | null, el2: Node | null;
    if (sel.focusNode === document.documentElement && (el = VScroller.current)) {
      for (; el2 = el.parentNode; el = el2) {}
      if ((el as ShadowRoot).getSelection) { sel = (el as ShadowRootWithSelection).getSelection() || sel; }
    }
    return sel;
  },
  getSelectionText (notTrim?: 1): string {
    let sel = window.getSelection(), s = sel.toString(), el: Element | null, rect: ClientRect;
    if (s && !VEventMode.lock() && (el = VScroller.current) && VDom.getEditableType(el) === EditableType.Editbox
        && (rect = sel.getRangeAt(0).getBoundingClientRect(), !rect.width || !rect.height)) {
      s = "";
    }
    return notTrim ? s : s.trim();
  },
  removeSelection (root): boolean {
    const sel = (root && (root as any).getSelection ? root as ShadowRootWithSelection : window).getSelection();
    if (!sel || VDom.selType(sel) !== "Range" || !sel.anchorNode) {
      return false;
    }
    sel.collapseToStart();
    return true;
  },
  click (element, rect, modifiers, addFocus): boolean {
    rect || (rect = VDom.getVisibleClientRect(element));
    element === VDom.lastHovered || VDom.hover(element, rect);
    VDom.mouse(element, "mousedown", rect, modifiers);
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    addFocus && element !== VEventMode.lock() && element !== document.activeElement && element.focus && element.focus();
    VDom.mouse(element, "mouseup", rect, modifiers);
    return VDom.mouse(element, "click", rect, modifiers);
  },
  simulateSelect (element, rect, flash, action, suppressRepeated): void {
    const y = window.scrollY;
    this.click(element, rect, null, true);
    VDom.ensureInView(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    flash && this.flash(element);
    if (element !== VEventMode.lock()) { return; }
    this.moveSel(element, action);
    if (suppressRepeated === true) { return this.suppressTail(true); }
  },
  moveSel (element, action): void {
    type TextElement = HTMLInputElement | HTMLTextAreaElement;
    const type = element instanceof HTMLTextAreaElement ? EditableType.Editbox
        : element instanceof HTMLInputElement ? EditableType.input_
        : (element as HTMLElement).isContentEditable ? EditableType.rich_ : EditableType.Default;
    if (type === EditableType.Default) { return; }
    if (action ? action === "all-input" && (type === EditableType.Editbox
            || type === EditableType.rich_ && element.textContent.indexOf("\n") >= 0)
        : type === EditableType.rich_ || (element as TextElement).value.length <= 0
          || type === EditableType.Editbox && element.clientHeight + 12 < element.scrollHeight) {
      return;
    }
    const sel = window.getSelection();
    try {
      if (type === EditableType.rich_) {
        const range = document.createRange();
        range.selectNodeContents(element);
        sel.removeAllRanges()
        sel.addRange(range);
      } else {
        (element as TextElement).select();
      }
      if (!action || action === "end") {
        sel.collapseToEnd();
      } else if (action === "start") {
        sel.collapseToStart();
      }
    } catch (e) {}
  },
  getVRect (this: void, clickEl, refer): VRect | null {
    VDom.getZoom(clickEl);
    VDom.prepareCrop();
    if (refer) {
      return VDom.getClientRectsForAreas(refer, [], [clickEl as HTMLAreaElement]);
    }
    const rect = VDom.getVisibleClientRect(clickEl),
    cr = clickEl.getBoundingClientRect(), bcr = VDom.fromClientRect(cr);
    return rect && !VDom.isContaining(bcr, rect) ? rect : VDom.NotVisible(null, cr) ? null : bcr;
  },
  _lastFlash: null,
  flash: function (this: DomUI, el: Element | null, rect?: VRect | null): HTMLElement | void {
    rect || (rect = this.getVRect(el as Element));
    if (!rect) { return; }
    const flashEl = VDom.createElement("div"), nfs = !document.webkitIsFullScreen;
    flashEl.className = "R Flash";
    VDom.setBoundary(flashEl.style, rect, nfs);
    VDom.bZoom !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bZoom);
    this.addElement(flashEl);
    this._lastFlash = flashEl;
    setTimeout(() => {
      this._lastFlash === flashEl && (this._lastFlash = null);
      flashEl.remove();
    }, this.flashLastingTime);
    return flashEl;
  } as DomUI["flash"],
  suppressTail (this: void, onlyRepeated: boolean): void {
    let func: HandlerNS.Handler<Function>, tick: number, timer: number;
    if (onlyRepeated) {
      func = function(event) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VUtils.remove(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function() { tick = Date.now(); return HandlerResult.Prevent; };
      tick = Date.now() + VSettings.cache.keyboard[0];
      timer = setInterval(function(info?: TimerType) {
        if (Date.now() - tick > 150 || info === TimerType.fake) {
          clearInterval(timer);
          VUtils && VUtils.remove(func);
        }
      }, 75);
    }
    VUtils.push(func, func);
  },
  SuppressMost (event) {
    VKeyboard.isEscape(event) && VUtils.remove(this);
    const key = event.keyCode;
    return key > VKeyCodes.f10 && key < VKeyCodes.minNotFn || key === VKeyCodes.f5 ?
      HandlerResult.Suppress : HandlerResult.Prevent;
  }
};
