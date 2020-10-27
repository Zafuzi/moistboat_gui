let planes = [];
let plane_list;
let editor, search, cfg, save, message_modal;

let active_plane_name = "";

document.addEventListener("DOMContentLoaded", dcl => {
    window.api.send("list_planes");
    plane_list = rplc8("#plane_list");
    editor = document.querySelector("#editor");
    cfg = document.querySelector("#cfg");
    search = document.querySelector("#search");
    save = document.querySelector("#save");
    message_modal = rplc8("#message_modal");

    search.addEventListener("input", e => {
        let o = planes.filter(p => {
            let value = p.toLowerCase().trim();
            let m = value.match(e.target.value.toLowerCase().trim())
            return (m);
        })
        update_planes(o);
    })

    save.addEventListener("click", e => {
        window.api.send("save_cfg", { plane_name: active_plane_name, cfg: cfg.value });
    })

    shortcut.add("Ctrl+S", function() {
        window.api.send("save_cfg", { plane_name: active_plane_name, cfg: cfg.value });
    });
})

function scrollIntoView(t) {
    if (typeof(t) != 'object') return;

    if (t.getRangeAt) {
        // we have a Selection object
        if (t.rangeCount == 0) return;
        t = t.getRangeAt(0);
    }

    if (t.cloneRange) {
        // we have a Range object
        var r = t.cloneRange(); // do not modify the source range
        r.collapse(true); // collapse to start
        var t = r.startContainer;
        // if start is an element, then startOffset is the child number
        // in which the range starts
        if (t.nodeType == 1) t = t.childNodes[r.startOffset];
    }

    // if t is not an element node, then we need to skip back until we find the
    // previous element with which we can call scrollIntoView()
    o = t;
    while (o && o.nodeType != 1) o = o.previousSibling;
    t = o || t.parentNode;
    if (t) t.scrollIntoView();
}

function update_planes(data) {
    let a = [];
    data.forEach(d => {
        a.push({ name: d });
    })
    plane_list.update(a, (e, d, i) => {
        e.addEventListener("click", () => {
            window.api.send("get_cfg", d.name);
            document.querySelectorAll("#navbar>div.active").forEach(p => {
                p.classList.remove("active");
            })
            e.classList.add("active");
            active_plane_name = d.name;
        })
    });
}

window.api.receive("list_planes", (data) => {
    planes = data;
    update_planes(data);
});

window.api.receive("alert", (data) => {
    message_modal.update([{ message: data }]);
    document.querySelector("#message_modal").style.display = "block";
    let x = setInterval(() => {
        document.querySelector("#message_modal").style.display = "none";
        clearInterval(x);
    }, 3000)
    cfg.focus();
});

window.api.receive("get_cfg", (data) => {
    cfg.innerHTML = data;
});