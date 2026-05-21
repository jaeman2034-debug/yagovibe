/* public/firebase-messaging-sw.js */
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCJoahD8gJDGlGM3GWoob3tsaVS4D93W3wCw",
    authDomain: "yago-vibe-spt.firebaseapp.com",
    projectId: "yago-vibe-spt",
    storageBucket: "yago-vibe-spt.appspot.com",
    messagingSenderId: "1064602587952",
    appId: "1:1064602587952:web:4ff8a2cbca6a3e4be5b48b",
});

const messaging = firebase.messaging();

function normalizeFcmRoutePath(path) {
    if (!path || typeof path !== "string" || path.indexOf("/") !== 0) return path || "";
    var overview = path.match(/^\/team\/([^/]+)\/overview\/?(?:\?|$)/);
    if (overview) return "/team/" + overview[1] + "?tab=home";
    var act = path.match(/^\/team\/([^/]+)\/activities\/([^/?#]+)/);
    if (act) {
        var q = path.indexOf("?");
        var sp = q >= 0 ? new URLSearchParams(path.slice(q + 1)) : new URLSearchParams();
        var tail = "?tab=schedule&activityId=" + encodeURIComponent(act[2]);
        if (sp.get("tab") === "attendance") tail += "&focus=attendance";
        return "/team/" + act[1] + tail;
    }
    return path;
}

function appendNotifClickIdToUrl(url, notificationId) {
    if (!url || !notificationId) return url;
    try {
        var u = new URL(url.indexOf("http") === 0 ? url : url, self.location.origin);
        u.searchParams.set("__yago_nc", String(notificationId));
        return u.href;
    } catch (e) {
        return url;
    }
}

function resolveFcmRoute(data) {
    if (!data || typeof data !== "object") return "";
    var route = data.route;
    if (typeof route === "string" && route.indexOf("/") === 0) return normalizeFcmRoutePath(route);
    var type = data.type;
    var teamId = data.teamId;
    var activityId = data.activityId;
    if (teamId && activityId && (type === "activity_created" || type === "team_notice")) {
        return "/team/" + encodeURIComponent(teamId) + "?tab=schedule&activityId=" + encodeURIComponent(activityId);
    }
    if (teamId && activityId && type === "attendance_updated") {
        return (
            "/team/" +
            encodeURIComponent(teamId) +
            "?tab=schedule&activityId=" +
            encodeURIComponent(activityId) +
            "&focus=attendance"
        );
    }
    if (teamId && type === "parent_link_created") {
        return "/team/" + encodeURIComponent(teamId) + "?tab=home";
    }
    if (teamId && type === "TEAM_JOIN_APPROVED") {
        return "/team/" + encodeURIComponent(teamId) + "?onboarding=1";
    }
    if (teamId && (type === "fee_reminder" || type === "billing_re_register_request")) {
        return "/team/" + encodeURIComponent(teamId) + "?tab=home";
    }
    var chatId = data.chatId;
    if (typeof chatId === "string" && chatId) return "/app/chat/" + chatId;
    var roomId = data.roomId;
    if (typeof roomId === "string" && roomId) return "/chat/" + roomId;
    return "";
}

messaging.onBackgroundMessage((payload) => {
    console.log("🎯 백그라운드 메시지 수신:", payload);
    var n = payload.notification || {};
    var title = n.title || "알림";
    var body = n.body || "";
    var data = payload.data || {};
    var route = resolveFcmRoute(data);
    var options = {
        body: body,
        icon: "/icons/icon-maskable-512.png",
        data: Object.assign({}, data, route ? { route: route } : {}),
        tag: (data.messageId && String(data.messageId)) || "yago-fcm-bg",
    };
    return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    var raw = event.notification.data || {};
    var route = raw.route || resolveFcmRoute(raw);
    if (!route) return;

    var nid = raw.notificationId ? String(raw.notificationId) : "";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            var baseUrl = route.indexOf("http") === 0 ? route : new URL(route, self.location.origin).href;
            var url = nid ? appendNotifClickIdToUrl(baseUrl, nid) : baseUrl;
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url && "focus" in client) {
                    return client.focus().then(function () {
                        if ("navigate" in client && typeof client.navigate === "function") {
                            return client.navigate(url).catch(function () {
                                return clients.openWindow(url);
                            });
                        }
                        return clients.openWindow(url);
                    });
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
