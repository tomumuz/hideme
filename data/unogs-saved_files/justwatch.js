(function () {
    if (window.hasOwnProperty("JustWatch")) {
        console.log('There already is a globally defined variable with the name "JustWatch". \nAborting widget initialization.')
        return
    }

    // Variables
    const widgetHost = "https://widget.justwatch.com"
    let iframeIndex = 0

    // For more convenient reloading of widgets, make initializeWidgets available globally.
    window.JustWatch = {
        reloadWidgets: initializeWidgets
    }

    // Initialize widgets
    initializeWidgets()

    function initializeWidgets() {
        console.log("attempting to load widgets")
        let nodeSelection = document.querySelectorAll('[data-jw-widget]')
        if (nodeSelection.length < 1) {
            // Legacy fallback
            nodeSelection = document.querySelectorAll(".justwatch-widget")
        }

        if (nodeSelection.length < 1) {
            console.log("Couldn't find JustWatch widget element.")
            return
        }

        nodeSelection.forEach(function (widgetEl) {
            // The stringified index is used to identify the iframes.
            // It's put into the url query params of the src attribute of the iframe.
            // The widget in the iframe is required to identify with its key on each resize.
            const iframeKey = iframeIndex + ""
            iframeIndex++

            const queryParams = {
                iframe_key: iframeKey,
                language: (window.navigator.userLanguage || window.navigator.languages[0] || window.navigator.language || "").slice(0, 2)
            }

            let appendIframe

            // Add data attributes to query params
            for (let i = 0; i < widgetEl.attributes.length; i++) {
                const attr = widgetEl.attributes[i]
                if (!attr.nodeName.startsWith("data-")) {
                    continue
                }
                if (attr.nodeName === "data-jw-widget") {
                    continue
                }
                if (attr.nodeName === "data-append-iframe") {
                    appendIframe = true
                    continue
                }

                queryParams[attr.nodeName.slice(5).replace(/-/g, "_")] = attr.nodeValue
            }
            queryParams["webpage"] = window.location.href

            // Format query params as string
            const queryParamString = Object.keys(queryParams)
                .map(key => {
                    return encodeURIComponent(key) + "=" + encodeURIComponent(queryParams[key])
                })
                .join("&")

            // Create iframe and replace the widget element with it
            const widgetIframe = document.createElement("iframe")
            widgetIframe.src = widgetHost + "/inline_widget?" + queryParamString
            widgetIframe.className = "jw-widget-iframe"
            widgetIframe.width = "100%"
            widgetIframe.height = "1px"
            widgetIframe.style.borderRadius = "4px"
            widgetIframe.frameBorder = "0"

            if (appendIframe) {
                const children = widgetEl.children
                for (let i = 0; i < children.length; i++) {
                    if (children[i].className.indexOf("jw-widget-iframe") > -0.5) {
                        widgetEl.removeChild(children[i])
                    }
                }
                widgetEl.appendChild(widgetIframe)
            } else {
                widgetEl.parentElement.replaceChild(widgetIframe, widgetEl)
            }

            // Add iframe message event listener
            window.addEventListener("message", onWidgetMessage, false)

            // onWidgetMessage handles messages from within the iframe.
            function onWidgetMessage(event) {
                if (!event.data.hasOwnProperty("sender")) {
                    return
                }
                if (event.data.sender !== "jw_widget") {
                    return
                }
                if (event.data.key !== iframeKey) {
                    return
                }

                switch (event.data.type) {
                    case "resize":
                        widgetIframe.height = event.data.cssHeight
                        break;
                    case "full-path":
                        handleFullPathMessage(event)
                        break;
                    case "hide":
                        handleHideMessage(event)
                    default:
                        break;
                }
            }

            function handleHideMessage(event) {
                if (!event.data.brandingLinkId) {
                    return
                }
                // Remove branding link element
                document.getElementById(event.data.brandingLinkId).remove();
                // Remove iframe element. Wrapped in try/catch as partners might
                // supply wrapper div id so iframe could be gone already.
                try {
                    const widgetIframeElements = Array.from(document.getElementsByClassName("jw-widget-iframe"))
                    const senderIframeElement = widgetIframeElements.find(el => {
                        const srcURL = new URL(el.src)
                        const iframeKey = srcURL.searchParams.get("iframe_key");
                        return iframeKey === event.data.key
                    })
                    senderIframeElement.remove()
                } catch (error) {
                    // fail silently
                }
            }

            function handleFullPathMessage(event) {
                if (!event.data.fullPath) {
                    return
                }
                const widgetIframeElements = Array.from(document.getElementsByClassName("jw-widget-iframe"))
                const senderIframeElement = widgetIframeElements.find(el => {
                    const srcURL = new URL(el.src)
                    const iframeKey = srcURL.searchParams.get("iframe_key");
                    return iframeKey === event.data.key
                })
                try {
                    // branding link has to occur right after widget element
                    // opted for being conservative to minimize risk of patching wrong link 
                    let candidates = []
                    candidates.push(senderIframeElement.nextElementSibling.firstElementChild)
                    candidates.push(senderIframeElement.nextElementSibling)
                    candidates.push(senderIframeElement.previousElementSibling)
                    candidates.push(senderIframeElement.previousElementSibling.firstElementChild)
                    const patchees = candidates.filter((c) => {
                        if (!c) { return false }
                        const href = c.getAttribute("href")
                        if (!href) { return false }
                        return href.startsWith("https://www.justwatch.com")
                    })
                    // multiple possible links, not doing anything
                    if (patchees.length === 1) {
                        // found it, patching…
                        patchees.pop().href = "https://www.justwatch.com" + event.data.fullPath
                    }
                } catch (error) {
                    console.log("error: unable to find branded links")
                    // fail silently if no branding link is found
                    return
                }
            }
        })
    }
})()