import { kPgReq } from "../background/page_messages"
import {
  CurCVer_, CurFFVer_, OnFirefox, OnChrome, OnEdge, $, $$, post_, disconnect_, isVApiReady_, simulateClick,
  toggleDark, browser_, selfTabId_, enableNextTick_, nextTick_, kReadyInfo, IsEdg_, import2, BrowserName_, pageTrans_
} from "./async_bg"
import {
  bgSettings_, KnownOptionsDataset, showI18n, setupBorderWidth_, Option_, AllowedOptions, debounce_, oTrans_,
  delayBinding, didBindEvent
} from "./options_base"
import { saveBtn, exportBtn, savedStatus, BooleanOption_, onKeyMappingsError, SaveBtn } from "./options_defs"
import { manifest } from "./options_permissions"

interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
export interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}

export let delayed_task: [string, MouseEventToPrevent | null] | null | undefined
export const advancedOptBtn = $<AdvancedOptBtn>("#advancedOptionsButton")
let advancedMode = false
export const clear_delayed_task = (): void => { delayed_task = null }

enableNextTick_(kReadyInfo.LOCK)
nextTick_(showI18n)
setupBorderWidth_ && nextTick_(setupBorderWidth_);
nextTick_((versionEl): void => {
  versionEl.textContent = manifest.version_name || manifest.version
}, $("#version"))

delayBinding(saveBtn, "click", ((virtually): void => {
    if (virtually !== false) {
      void Option_.saveOptions_().then((changed): void => { changed && saveBtn.onclick(false) })
      return
    }
    const toSync = Option_.syncToFrontend_;
    Option_.syncToFrontend_ = [];
    if (OnFirefox) {
      saveBtn.blur()
    }
    saveBtn.disabled = true;
    (saveBtn.firstChild as Text).data = oTrans_("115_3")
    exportBtn.disabled = false;
    savedStatus(false)
    window.onbeforeunload = null as never;
    window.addEventListener("beforeunload", refreshSync, true)
    if (toSync.length === 0) { return; }
    setTimeout((toSync1: typeof Option_.syncToFrontend_): void => {
      void post_(kPgReq.notifyUpdate, toSync1.map(key => bgSettings_.valuesToLoad_[key]))
    }, 100, toSync)
}) as SaveBtn["onclick"] as (ev: Event) => void, "on")

const refreshSync = (): void => { post_(kPgReq.saveToSyncAtOnce) }

let optionsInit1_ = function (): void {
  advancedOptBtn.onclick = function (ev, init): void {
    let oldVal: boolean | null = null
    const loadOld = (): boolean => oldVal = <boolean> bgSettings_.get_("showAdvancedOptions")
    if (ev != null || (init === "hash" && loadOld() === false)) {
      advancedMode = !advancedMode;
      void bgSettings_.set_("showAdvancedOptions", advancedMode)
    } else {
      advancedMode = oldVal != null ? oldVal : loadOld()
    }
    let el = init === true && advancedMode ? null : $("#advancedOptions")
    nextTick_((): void => {
      while (el) { el.style.display = advancedMode ? "" : "none"; el = el.nextElementSibling as HTMLElement | null }
    const s = advancedMode ? "Hide" : "Show";
    (this.firstChild as Text).data = oTrans_(s) || s
    this.setAttribute("aria-checked", "" + advancedMode);
    }, 9);
  };
  advancedOptBtn.onclick(null, true)
  Option_.suppressPopulate_ = false
  if (Build.NDEBUG) {
    for (let key in Option_.all_) { void Option_.all_[key as "vimSync"].fetch_() }
  } else {
    const fetching = Object.values(Option_.all_).map(i => i.fetch_() && i.field_).filter(i => i)
    if (fetching.length > 0) {
      console.log("Warning: some options are not ready to fetch:", fetching.join(", "))
    }
  }
  OnFirefox && Build.OS & (1 << kOS.unixLike) && bgSettings_.os_ === kOS.unixLike && nextTick_((): void => {
    for (let key in Option_.all_) {
      const obj = Option_.all_[key as "vimSync"]
      if (obj instanceof BooleanOption_) {
        obj.element_.classList.add("baseline")
      }
    }
  });
  if (Option_.all_.exclusionRules.previous_.length > 0) {
    nextTick_((el): void => {
      el.style.visibility = "";
    }, $("#exclusionToolbar"));
  }

  document.addEventListener("keyup", function (this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== kKeyCode.enter) {
      if (i !== kKeyCode.space) { return; }
      if (el instanceof HTMLSpanElement && el.parentElement instanceof HTMLLabelElement) {
        event.preventDefault();
        const ctrl = el.parentElement.control as HTMLInputElement
        ctrl.disabled || ctrl.readOnly || simulateClick(ctrl)
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute("href") || setTimeout(function (el1) {
        simulateClick(el1)
        el1.blur();
      }, 0, el);
    } else if (event.ctrlKey || event.metaKey) {
      el.blur && el.blur();
      if (savedStatus()) {
        didBindEvent("click")
        return saveBtn.onclick();
      }
    }
  });

  delayBinding("[data-check]", "input", function onCheck(): void {
    for (const el of $$("[data-check]")) {
      el.removeEventListener("input", onCheck)
    }
    void import2("./options_checker.js")
  })
  delayBinding("[data-auto-resize]", "click", (event): void => {
    const target = $("#" + ((event.target as HTMLElement).dataset as KnownOptionsDataset).autoResize)
    let height = target.scrollHeight, width = target.scrollWidth, dw = width - target.clientWidth;
    if (height <= target.clientHeight && dw <= 0) { return; }
    const maxWidth = Math.max(Math.min(innerWidth, 1024) - 120, 550);
    target.style.maxWidth = width > maxWidth ? maxWidth + "px" : "";
    target.style.height = target.style.width = "";
    dw = width - target.clientWidth;
    let delta = target.offsetHeight - target.clientHeight;
    delta = dw > 0 ? Math.max(26, delta) : delta + 18;
    height += delta;
    if (dw > 0) {
      target.style.width = target.offsetWidth + dw + 4 + "px";
    }
    target.style.height = height + "px";
  })
  delayBinding("[data-delay]", "click", function (this: HTMLElement, event): void {
    let str = (this.dataset as KnownOptionsDataset).delay, e = null as MouseEventToPrevent | null
    if (str === "event") { e = event as MouseEventToPrevent || null }
    if (str !== "continue") {
      event && event.preventDefault();
    }
    delayed_task = ["#" + this.id, e]
    if (document.readyState === "complete") {
      void import2("./options_ext.js")
      return;
    }
    window.addEventListener("load", function onLoad(event1): void {
      if (event1.target === document) {
        window.removeEventListener("load", onLoad);
        void import2("./options_ext.js")
      }
    });
  }, "on")
  OnChrome && Build.MinCVer < BrowserVer.MinEnsuredWebkitUserSelectAll
      && CurCVer_ < BrowserVer.MinEnsuredWebkitUserSelectAll &&
  delayBinding(".sel-all", "mousedown", function (this: HTMLElement, event): void {
    if (event.target !== this) { return; }
    event.preventDefault();
    getSelection().selectAllChildren(this);
  })

  const permissionEls = $$("[data-permission]");
  permissionEls.length > 0 && ((els: HTMLElement[]): void => {
    const validKeys2 = manifest.permissions || []
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = (el.dataset as KnownOptionsDataset).permission
      let transArgs: ["beforeChromium" | "lackPermission", string[]]
      if (key[0] === "C") {
        if (OnChrome ? CurCVer_ >= parseInt(key.slice(1)) : key.includes("nonC")) { continue }
        const secondCond = key.split(",", 2)[1] || ","
        if (secondCond[0] === "." ? (window as Dict<any>)[secondCond.slice(1)] != null
            : secondCond[0] === "(" && matchMedia(secondCond).matches) { continue }
        if (!OnChrome && secondCond[0] === ".") {
          nextTick_((el2): void => { el2.style.display = "none" }, el.parentElement as HTMLElement)
          continue
        }
        transArgs = OnChrome || secondCond === "," ? ["beforeChromium", [key.slice(1).split(",", 1)[0]]]
            : ["lackPermission", [secondCond]]
      } else {
        if (!Build.MV3) { key === "action" ? (key = "browser_action") : key }
        if (key in manifest || validKeys2.includes(key)) { continue }
        transArgs = ["lackPermission", [key ? ":\n* " + key : ""]]
      }
      nextTick_((el1): void => {
        (el1 as TextElement).disabled = true;
        const str = oTrans_("invalidOption", [oTrans_(transArgs[0], transArgs![1])])
        if (el1 instanceof HTMLInputElement && el1.type === "checkbox") {
          (el1 as SafeHTMLElement as EnsuredMountedHTMLElement).nextElementSibling.tabIndex = -1;
          el1 = el1.parentElement as HTMLElement;
          el1.title = str
        } else {
          (el1 as TextElement).value = "";
          el1.title = str;
          delayBinding(el1.parentElement as HTMLElement, "click", onclick, "on")
          if (el1 instanceof HTMLSpanElement) {
            el1.style.textDecoration = "line-through"
          }
        }
      }, el);
    }
    function onclick(this: HTMLElement): void {
      const el = this.querySelector("[data-permission]") as TextElement | null;
      this.onclick = null as never;
      if (!el) { return; }
      const key = (el.dataset as KnownOptionsDataset).permission
      el.placeholder = oTrans_("lackPermission", [key ? `: "${key}"` : ""]);
    }
  })(permissionEls);
  if (OnEdge) {
    nextTick_((tipForNoShadow): void => {
      tipForNoShadow.innerHTML = '(On Edge, may need "<kbd>#VimiumUI</kbd>" as prefix if no Shadow DOM)';
    }, $("#tipForNoShadow"));
  }

  delayBinding("[data-href]", "mousedown", (): void => {
    for (const element of $$<HTMLAnchorElement & { dataset: KnownOptionsDataset }>("[data-href]")) {
      element.onmousedown = null as never
      void post_(kPgReq.convertToUrl, [element.dataset.href, Urls.WorkType.ConvertKnown]).then(([str]): void => {
        element.removeAttribute("data-href")
        element.href = str
      })
    }
  }, "on")

  const openExt = $<HTMLAnchorElement>("#openExtensionsPage");
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && CurCVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    nextTick_((el): void => { el.href = "chrome://extensions/configureCommands" }, openExt)
  } else if (OnChrome && IsEdg_) {
    nextTick_((el): void => { const s = "edge://extensions/";
        el.href = s + "shortcuts", el.textContent = s + "\u2026" }, openExt)
  } else if (OnFirefox) {
    nextTick_(([el, el2, el3]): void => {
      el.textContent = el.href = "about:addons";
      const el1 = el.parentElement as HTMLElement, prefix = GlobalConsts.FirefoxAddonPrefix;
      const MS = "manageShortcut", MS2 = `${MS}_2` as const
      !OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend ? el.before!(oTrans_(MS))
          : el1.insertBefore(new Text(oTrans_(MS)), el); // lgtm [js/superfluous-trailing-arguments]
      !OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend ? el.after!(oTrans_(MS2))
          : el1.insertBefore(new Text(oTrans_(MS2)), el.nextSibling) // lgtm [js/superfluous-trailing-arguments]
      el2.href = prefix + "shortcut-forwarding-tool/?src=external-vc-options";
      el3.href = prefix + "newtab-adapter/?src=external-vc-options";
    }, [openExt, $<HTMLAnchorElement>("#shortcutHelper"), $<HTMLAnchorElement>("#newTabAdapter")] as const);
  }

  if (OnFirefox || OnChrome) {
    nextTick_((el): void => {
      const children = el.children, anchor = children[1] as HTMLAnchorElement, name = oTrans_("NewTabAdapter");
      if (OnFirefox) {
        children[0].textContent = "moz";
        anchor.textContent = name;
        anchor.href = GlobalConsts.FirefoxAddonPrefix + "newtab-adapter/?src=external-vc-options_omni";
      }
      anchor.title = name + " - " + oTrans_(OnFirefox ? "addons" : "webstore");
    }, $("#chromeExtVomnibar"));
  }

  const onRefStatClick = (event: MouseEventToPrevent): void => {
    if (!advancedMode) {
      advancedOptBtn.onclick(null)
    }
    event.preventDefault();
    const sel2 = ((event.currentTarget as HTMLElement).dataset as KnownOptionsDataset).for.split(":").slice(-1)[0]
    const maybeNode2 = $$<EnsuredMountedHTMLElement & HTMLInputElement>(sel2)
    const node2 = (maybeNode2.find(i => i.checked) || maybeNode2[0]).nextElementSibling
    scrollAndFocus_(node2, OnChrome
        , (node3): void => { VApi && VApi.x(node3.parentElement.parentElement as SafeHTMLElement) })
  };
  for (const element of $$<HTMLLabelElement>(".ref-text")) {
    const name = (element.dataset as KnownOptionsDataset).for, fields = name.slice(name.indexOf(":") + 1)
    const targetOptName = name.split(":")[0]
    const opt = Option_.all_[targetOptName.replace("#", "") as "keyLayout"]
    const oldOnSave = opt.onSave_, box = element.parentElement as EnsuredMountedHTMLElement
    const syncForLabel = (): void => {
      nextTick_(([statEl, nameEl, checkboxes]): void => {
        const related = checkboxes.find(i => i.checked) || checkboxes[0]
        statEl.textContent = oTrans_(related.checked ? "145_2" : "144")
        if (nameEl) {
          const el2 = related.nextElementSibling as SafeHTMLElement, i2 = el2.getAttribute("data-i2")
          nameEl.textContent = i2 ? pageTrans_(i2)! : el2.textContent
        }
      }, [box.querySelector(".status-of-related")!, box.querySelector(".name-of-related")!,
          (fields !== name ? $$<HTMLInputElement>(fields) : [opt.element_]) ] as const)
    }
    opt.onSave_ = (): void | Promise<void> => { syncForLabel(); return oldOnSave.call(opt) }
    delayBinding(element, "click", onRefStatClick as (ev: EventToPrevent) => void, "on")
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    delayBinding(opt.element_, "change", syncForLabel, true)
    nextTick_(([el, s]): void => { el.htmlFor = s }, [element, targetOptName] as const)
    
  }
},
optionsInitAll_ = function (): void {
  optionsInit1_()
  optionsInit1_ = optionsInitAll_ = null as never

  !(Build.OS & (1 << kOS.mac)) || Build.OS & ~(1 << kOS.mac) && bgSettings_.os_ ||
  nextTick_((el): void => { el.textContent = "Cmd" }, $("#Ctrl"))
  for (let key in Option_.all_) {
    void Option_.all_[key as keyof AllowedOptions].onSave_()
  }
  nextTick_((): void => { document.documentElement!.classList.remove("loading") })
  void isVApiReady_.then(disconnect_)
  location.hash && nextTick_(window.onhashchange as () => void)
  enableNextTick_(kReadyInfo.NONE, kReadyInfo.LOCK);

  Option_.all_.keyMappings.onSave_ = () => post_(kPgReq.keyMappingErrors).then(onKeyMappingsError)
  let useDarkQuery = true
  let darkMedia: MediaQueryList | null = matchMedia("(prefers-color-scheme: dark)")
  const onChange = (): void => {
    if (Build.MV3 || OnFirefox && (Build.MinFFVer >= FirefoxBrowserVer.MinMediaQueryListenersWorkInBg
          || CurFFVer_ > FirefoxBrowserVer.MinMediaQueryListenersWorkInBg - 1)) { /* empty */ }
    else if (!useDarkQuery || !darkOpt.saved_) { /* empty */ }
    else { void post_(kPgReq.updateMediaQueries) }
    setTimeout(useLocalStyle, 34)
  }
  const darkOpt = Option_.all_.autoDarkMode
  const useLocalStyle = (): void => {
      const rawVal = darkOpt.readValueFromElement_()
      const val = rawVal === 2 ? !!darkMedia && darkMedia.matches : rawVal === 1
      if (VApi && VApi.z) {
        const root = VApi.y().r
        if (root) {
          for (let el of OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
                && Build.MinCVer >= BrowserVer.BuildMinForOf && CurCVer_ < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
                ? [].slice.call(root.children) : root.children as ArrayLike<Element> as HTMLElement[]) {
            if (el.localName !== "style") {
              el.classList.toggle("D", val)
              el = el.firstElementChild as HTMLElement | null || el
              if (el.localName === "iframe") {
                const isFind = el.classList.contains("Find")
                const childDoc = (el as HTMLIFrameElement).contentDocument!
                const dark = childDoc.querySelector("style#dark") as HTMLStyleElement
                dark && dark.sheet && (dark.sheet.disabled = !val)
                childDoc.body!.classList.toggle(isFind ? "D" : "has-dark", val)
                if (isFind) {
                  const input = VApi.y().f
                  input && input.parentElement!.classList.toggle("D", val)
                }
              }
            }
          }
        }
        void (post_(kPgReq.updatePayload, { key: "d", val }) as Promise<SettingsNS.FrontendSettingCache["d"]>)
        .then((val2): void => { VApi!.z!.d = val2 })
      }
      toggleDark(val ? rawVal === 2 ? 2 : 1 : 0)
  }
  // As https://bugzilla.mozilla.org/show_bug.cgi?id=1550804 said, to simulate color schemes, enable
  // https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#Color_scheme_simulation
  darkOpt.onSave_ = onChange;
  (OnChrome ? (Build.MinCVer >= BrowserVer.MinMediaQuery$PrefersColorScheme
      || CurCVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme - 1) : !OnEdge) ? nextTick_((): void => {
    if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
        && CurFFVer_ < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme - 1) {
      darkMedia = null
      return
    }
    darkOpt.previous_ === 2 && void isVApiReady_.then(onChange)
    darkMedia!.onchange = onChange
  }) : (darkMedia = null)

  OnFirefox && setTimeout((): void => {
    const K = GlobalConsts.kIsHighContrast
    const hasFC = matchMedia("(forced-colors)").matches
    let valInLocal: string | null | undefined
    const test = hasFC ? null : document.createElement("div")
    if (test) {
      test.style.display = "none"
      test.style.color = "#543";
      (document.body as HTMLBodyElement).append!(test)
    }
    void post_(kPgReq.getStorage, K).then((res): void => {
      valInLocal = res[K] as string | undefined
      if (!test && valInLocal == null) { return }
    requestIdleCallback!((): void => {
      const newColor = test && (getComputedStyle(test).color || "").replace(<RegExpG> / /g, "").toLowerCase()
      const isHC = hasFC ? false : !!newColor && newColor !== "rgb(85,68,51)"
      test && test.remove()
      const oldIsHC = valInLocal === "1"
      if (isHC !== oldIsHC) {
        void post_(kPgReq.reloadCSS, { hc: isHC })
      }
    }, { timeout: 1e3 })
    })
  }, 34)

  nextTick_(() => {
    setTimeout(() => {
      const loaderScript = document.createElement("script")
      loaderScript.src = "loader.js"
      loaderScript.async = true
      document.head!.appendChild(loaderScript)
      document.documentElement!.classList.add("smooth")
    }, 120)
  })
};

delayBinding(Option_.all_.userDefinedCss.element_, "input", debounce_((): void => {
  const self = Option_.all_.userDefinedCss
  const isDebugging = self.element_.classList.contains("debugging")
  if (self.saved_ && !isDebugging || !VApi || !VApi.z) { return }
  const newVal = self.readValueFromElement_(), isSame = newVal === self.previous_,
  cssPromise = post_(kPgReq.parseCSS, [newVal, selfTabId_]), misc = VApi.y(), root = misc.r
  void cssPromise.then(css => {
  self.element_.classList.toggle("debugging", !isSame)
  VApi!.t({
    k: root || isSame ? 0 : kTip.raw, t: oTrans_("livePreview") || "Live preview CSS\u2026",
    H: css.ui, f: css.find
  })
  const frame = root && root.querySelector("iframe.Omnibar") as HTMLIFrameElement | null
  const doc = frame && frame.contentDocument
  if (doc) {
    let styleDebug = doc.querySelector("style.debugged") || doc.querySelector("style#custom")
    if (!styleDebug) {
      /** should keep the same as {@link ../front/vomnibar#Vomnibar_.css_} */
      (styleDebug = doc.createElement("style")).type = "text/css"
      styleDebug.id = "custom"
    }
    styleDebug.parentNode || (doc.head as HTMLHeadElement).appendChild(styleDebug)
    styleDebug.classList.add("debugged")
    styleDebug.textContent = (isSame ? "\n" : "\n.transparent { opacity: 1; }\n") + (css.omni && css.omni + "\n" || "")
  }
  })
}, 1200, null, 0))

if (OnChrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && CurCVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  nextTick_(el => { el.classList.add("font-fix") }, $("select"))
}

delayBinding("#importButton", "click", (): void => {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : simulateClick($("#settingsFile"))
}, "on")

nextTick_((el0): void => {
  const platform = bgSettings_.platform_
  let name = BrowserName_, version: number = OnFirefox ? CurFFVer_ : CurCVer_
  if (!name) {
  const data = navigator.userAgentData
  const brands = (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredNavigator$userAgentData ? data!.brands
      : data && (OnChrome && Build.MinCVer <= BrowserVer.Only$navigator$$userAgentData$$$uaList
          ? data.brands || data.uaList : data.brands) || []
    ).filter(i => (OnChrome ? i.version === CurCVer_ && i.brand !== "Chromium" || i.brand.includes("Opera")
      : OnFirefox ? i.version === CurFFVer_ : true) && !(` ${i.brand} `.includes(" Not ")))
  const brand = OnChrome && brands.find(i => (<RegExpOne> /\b(Edge|Opera)\b/).test(i.brand)) || brands[0]
  const nameFallback = OnFirefox ? "Firefox" : IsEdg_ ? "MS Edge" : ""
  name = brand ? brand.brand : data ? nameFallback || "Chromium"
      : OnChrome && ((<RegExpOne> /\bChromium\b/).exec(navigator.userAgent!) || [""])[0] || nameFallback || "Chrome"
    if (brand) { version = brand.version }
  }
el0.textContent = (OnEdge ? "MS Edge (EdgeHTML)" : name + " " + version
  ) + oTrans_("comma") + oTrans_("NS")
  + (oTrans_(platform as "win" | "mac") || platform[0].toUpperCase() + platform.slice(1))
}, $("#browserName"));

document.addEventListener("keydown", (event): void => {
  if (event.keyCode !== kKeyCode.space) {
    if (!VApi || !VApi.z || "input textarea".includes(document.activeElement!.localName as string)) { return; }
    const key = VApi.r[3]({c: kChar.INVALID, e: event, i: event.keyCode, v: ""}, kModeId.NO_MAP_KEY)
    if (key === "a-" + kChar.f12) {
      let el2 = $<HTMLSelectElement>("#importOptions");
      const oldSelected = el2.selectedIndex, callback = (): void => {
        el2.onchange && el2.onchange(null as never)
        el2.selectedIndex = oldSelected
      }
      $<HTMLOptionElement>("#recommendedSettings").selected = true;
      el2.onchange != null ? callback() : setTimeout(callback, 100) && el2.click()
    }
    else if (key === "?") {
      if (!Build.NDEBUG) {
        console.log('The document receives a "?" key which has been passed (excluded) by Vimium C,',
          "so open the help dialog.");
      }
      $("#showCommands").click();
    }
    return;
  }
  const el = event.target as Element;
  if (el.localName === "span" && (el as EnsuredMountedHTMLElement).parentElement.localName === "label") {
    event.preventDefault();
  }
});

export const onHash_ = (hash: string): void => {
  let node: HTMLElement | null;
  hash = hash.slice(hash[1] === "!" ? 2 : 1);
  if (!hash || !(<RegExpI> /^[a-z][\w-]*$/i).test(hash)) { return; }
  if (node = $(`[data-hash="${hash}"]`) as HTMLElement | null) {
    didBindEvent("click")
    if (node.onclick) {
        (node as ElementWithHash).onclick(null, "hash");
    }
  } else if (node = !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredCaseInSensitiveAttrSelector
      || CurCVer_ >= BrowserVer.MinEnsuredCaseInSensitiveAttrSelector)
      ? $(`[id="${hash.replace(<RegExpG & RegExpSearchable<0>> /-/g, "")}" i]`)
      : hash.includes("-") && $("#" + hash.replace(<RegExpG & RegExpSearchable<0>> /-[a-z]/gi
        , s => s[1].toUpperCase())) || $("#" + hash)) {
    if ((node.dataset as KnownOptionsDataset).model) {
      node = node.localName === "input" && (node as HTMLInputElement).type === "checked"
          ? node.parentElement as HTMLElement : node
      node.classList.add("highlight")
    }
    const callback = function (event?: Event): void {
      if (event && event.target !== window) { return; }
      if (window.onload) {
        window.onload = null as never;
        !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior
          || Element.prototype.scrollBy as unknown)
        ? (scrollTo as typeof scrollBy)({behavior: "instant", top: 0, left: 0}) : scrollTo(0, 0)
      }
      scrollAndFocus_(node!)
    };
    if (document.readyState === "complete") { return callback(); }
    window.scrollTo(0, 0);
    window.onload = callback;
  }
};
window.onhashchange = () => { onHash_(location.hash) }

const scrollAndFocus_ = <T extends HTMLElement> (node: T, near?: boolean, callback?: (node: T) => void): void => {
  let last = -1
  OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && CurCVer_ < BrowserVer.MinScrollIntoViewOptions
  ? node.scrollIntoViewIfNeeded!(true) : node.scrollIntoView({ block: near ? "nearest" : "center", behavior: "smooth" })
  const timer = setInterval((): void => {
    const newTop = scrollY
    if (newTop === last) { clearInterval(timer); callback && callback(node); node.focus() }
    last = newTop
  }, 72)
}

void bgSettings_.preloadCache_().then(optionsInitAll_)
void post_(kPgReq.keyMappingErrors).then((err): void => { nextTick_(onKeyMappingsError, err) })
void post_(kPgReq.whatsHelp).then((matched): void => {
  matched !== "?" && nextTick_(([el, s]): void => { el.textContent = s }, [$("#questionShortcut"), matched] as const)
})

delayBinding("#openExtensionsPage", "click", (event: EventToPrevent): void => {
    event.preventDefault();
    if (OnFirefox) {
      VApi ? VApi.h(kTip.raw, 0, oTrans_("haveToOpenManually"))
      : alert(oTrans_("haveToOpenManually"))
    } else {
      void post_(kPgReq.focusOrLaunch, { u: (event.target as HTMLAnchorElement).href, p: true })
    }
})
delayBinding(document, "click", function onClickOnce(): void {
  const api1 = VApi, misc = api1 && api1.y()
  if (!misc || !misc.r) { return; }
  document.removeEventListener("click", onClickOnce, true);
  misc.r.addEventListener("click", function (event): void {
    let target = event.target as HTMLElement, str: string;
    if (VApi && target.classList.contains("HelpCommandName")) {
      str = target.textContent.slice(1, -1);
      VApi.p({
        H: kFgReq.copy,
        s: str
      });
    }
  }, true);

  OnChrome && document.addEventListener("click", (event): void => {
    const el = event.target as Element
    if (el.localName !== "a" || !(event.ctrlKey || event.metaKey) || selfTabId_ < GlobalConsts.TabIdNone) { return }
    const api2 = VApi, hintWorker = api2 && api2.b, stat = hintWorker && hintWorker.$()
    if (stat && stat.a && stat.k && stat.k.c === null) { // .a: isActive; .k.c === null : is calling executor
      const m1 = stat.m & ~HintMode.queue
      if (m1 < HintMode.min_job && m1 & HintMode.newTab && !(m1 & HintMode.focused)) {
          setTimeout((): void => {
            selfTabId_ >= 0 && (browser_.tabs ? browser_.tabs.update(selfTabId_, { active: true }, (): void => {})
            : void post_(kPgReq.callApi, { module: "tabs", name: "update", args: [selfTabId_, { active: true }] }))
          }, 0)
      }
    }
  })
}, true);

delayBinding("#testKeyInputBox", "focus", function KeyTester(_focusEvent: Event): void {
  const box = _focusEvent.currentTarget as HTMLElement
  const testKeyInput = $<HTMLElement>("#testKeyInput")
  const text_ = (newText?: string, moveSel?: 0): string => {
    const result = newText !== void 0 ? testKeyInput.textContent = newText : testKeyInput.textContent
    if (newText && moveSel !== 0 && document.activeElement === testKeyInput) {
      const sel = getSelection(), node = testKeyInput.firstChild as Text
      sel.setBaseAndExtent(node, newText.length, node, newText.length)
    }
    return result
  }
  const blockEvent = ((event: EventToPrevent) => { event.preventDefault() }) as (ev: Event) => void
  let lastKey: KeyboardEvent | undefined, lastPrevented = kKeyCode.None, hasOutline = false
  let lastKeyLayout: kKeyLayout
  testKeyInput.onkeydown = (event): void => {
    hasOutline && (hasOutline = false, testKeyInput.classList.remove("outline"))
    if (event.keyCode === kKeyCode.ime || event.key === "Process") {
      text_("")
      return
    }
    if (VApi && !event.repeat) {
      const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event as KeyboardEventToPrevent,
          i: event.keyCode, v: ""}
      const key = VApi.r[3](eventWrapper, kModeId.NO_MAP_KEY), isEsc = key === "esc" || key === "c-["
      const key2 = VApi.z!.l & kKeyLayout.inCmdIgnoreIfNotASCII
          ? VApi.r[3](eventWrapper, kModeId.NO_MAP_KEY_EVEN_MAY_IGNORE_LAYOUT) : key
      const s1 = key.length > 1 ? `<${key}>` : key || "(empty)"
      const s2 = key2 === key ? "" : key2.length > 1 ? `<${key2}>` : key2 || "(empty)"
      lastKey = event, lastKeyLayout = VApi.z!.l
      text_(s2 ? `${s1} / ${s2}` : s1)
      if (key === "enter" || key === "tab" || key === "s-tab" || isEsc || key === "f12") {
        (key === "enter" || isEsc) && testKeyInput.blur()
        return
      }
    }
    lastPrevented = event.keyCode
    blockEvent(event)
  }
  testKeyInput.onkeyup = (event): void => {
    if ((event as KeyboardEventToPrevent).keyCode === lastPrevented) { blockEvent(event) }
  }
  testKeyInput.onfocus = (): void => {
    if (VApi) {
      testKeyInput.classList.add("outline")
      hasOutline = true
      const text = (testKeyInput.previousElementSibling as HTMLElement).textContent
      VApi.f(kFgCmd.insertMode, Object.setPrototypeOf<CmdOptions[kFgCmd.insertMode]>(
          { i: true, r: 0, k: "v-esc:test", p: true, h: text }, null), 1, 0)
    }
  }
  testKeyInput.onblur = (): void => {
    if (VApi) {
      VApi.f(kFgCmd.dispatchEventCmd, Object.setPrototypeOf<CmdOptions[kFgCmd.dispatchEventCmd]>(
          { type: "keydown", key: "Esc", esc: true }, null), 1, 0)
    }
  }
  testKeyInput.addEventListener("compositionend", (): void => { text_("") })
  testKeyInput.onpaste = blockEvent
  testKeyInput.onclick = (): void => { testKeyInput.focus() }
  const checkboxTestKeyInInput = $<HTMLInputElement>("#testKeyInInput")
  checkboxTestKeyInInput.onchange = (): void => {
    checkboxTestKeyInInput.checked ? testKeyInput.contentEditable = "true"
        : testKeyInput.removeAttribute("contenteditable")
    testKeyInput.focus()
  }
  box.removeEventListener("focus", KeyTester, true)
  box.addEventListener("blur", (event): void => {
    const active = hasOutline ? event.relatedTarget as HTMLElement : null
    if (active ? !box.contains(active) : hasOutline) {
      hasOutline = false
      testKeyInput.classList.remove("outline")
    }
  }, true)
  Option_.onFgCacheUpdated_ = () => { if (lastKey && lastKeyLayout !== VApi!.z!.l) { testKeyInput.onkeydown(lastKey) } }
}, true)
