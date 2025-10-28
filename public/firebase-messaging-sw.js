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

messaging.onBackgroundMessage((payload) => {
    console.log("🎯 백그라운드 메시지 수신:", payload);
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/icon-192x192.png",
    });
});
