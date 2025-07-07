import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDVUzBgRChD8FhdgMoKosCLpLX3zGgWB_0",
  authDomain: "money-master-official-site-new.firebaseapp.com",
  projectId: "money-master-official-site-new",
  storageBucket: "money-master-official-site-new.appspot.com",
  messagingSenderId: "580013071708",
  appId: "1:580013071708:web:76363a43638401cda07599",
  measurementId: "G-26CBLGCKC1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load wallet balance and update UI
window.loadWithdrawPage = async function () {
  const uid = localStorage.getItem("userUID");
  if (!uid) {
    alert("Please login first.");
    window.location.href = "index.html";
    return;
  }

  try {
    const userRef = doc(db, "User", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      alert("User data not found.");
      return;
    }

    const coins = snap.data().coins || 0;
    const inrValue = (coins / 1000).toFixed(2);

    document.getElementById("coinDisplay").textContent = coins;
    document.getElementById("inrValue").textContent = "₹" + inrValue;

    const confirmBtn = document.getElementById("confirmBtn");
    if (coins >= 200000) {
      confirmBtn.classList.add("enabled");
      confirmBtn.disabled = false;
    } else {
      confirmBtn.classList.remove("enabled");
      confirmBtn.disabled = true;
    }
  } catch (err) {
    console.error("Error loading coin balance:", err);
    alert("Error loading wallet. Try again later.");
  }
};

// Show selected payment form
window.showForm = function (method) {
  document.getElementById("upiForm").style.display = "none";
  document.getElementById("bankForm").style.display = "none";
  document.getElementById("paypalForm").style.display = "none";

  if (method === "upi") {
    document.getElementById("upiForm").style.display = "block";
  } else if (method === "bank") {
    document.getElementById("bankForm").style.display = "block";
  } else if (method === "paypal") {
    document.getElementById("paypalForm").style.display = "block";
  }
};

// Handle withdrawal submission
window.submitWithdraw = async function () {
  const uid = localStorage.getItem("userUID");
  if (!uid) return alert("Unauthorized request.");

  const method = document.querySelector('input[name="method"]:checked')?.value;
  if (!method) {
    alert("Please select a payment method.");
    return;
  }

  const snd = new Audio("assets/sound.mp3");
  snd.play();

  let details = {};
  let amount = 0;

  if (method === "upi") {
    const upiID = document.getElementById("upiID").value.trim();
    amount = parseInt(document.getElementById("upiAmount").value.trim());
    if (!upiID || !amount) return alert("Please fill all UPI fields.");
    details = { method, upiID, amount };
  }

  if (method === "bank") {
    const name = document.getElementById("bankName").value.trim();
    const ifsc = document.getElementById("bankIFSC").value.trim();
    const acc = document.getElementById("bankAcc").value.trim();
    amount = parseInt(document.getElementById("bankAmount").value.trim());
    if (!name || !ifsc || !acc || !amount) return alert("Please fill all Bank fields.");
    details = { method, name, ifsc, acc, amount };
  }

  if (method === "paypal") {
    const payEmail = document.getElementById("paypalEmail").value.trim();
    amount = parseInt(document.getElementById("paypalAmount").value.trim());
    if (!payEmail || !amount) return alert("Please fill all PayPal fields.");
    details = { method, email: payEmail, amount };
  }

  const coinToDeduct = amount * 1000;

  try {
    const userRef = doc(db, "User", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return alert("User data not found.");

    const currentCoins = snap.data().coins || 0;
    if (coinToDeduct > currentCoins) {
      alert("Insufficient coins for withdrawal.");
      return;
    }

    // First, log withdrawal request
    const requestRef = collection(db, "Withdrawals", uid, "requests");
    await addDoc(requestRef, {
      uid,
      method,
      amount,
      details,
      status: "pending",
      createdAt: serverTimestamp()
    });

    // Then deduct coins only if request is stored successfully
    await updateDoc(userRef, {
      coins: currentCoins - coinToDeduct
    });

    alert("Withdraw request submitted successfully!");
    window.location.reload();

  } catch (err) {
    console.error("Withdrawal error:", err);
    alert("Failed to submit withdrawal. Try again.");
  }
};
import {
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Load withdrawal history
async function loadWithdrawalHistory() {
  const uid = localStorage.getItem("userUID");
  const statusList = document.getElementById("statusList");

  if (!uid) {
    statusList.innerHTML = "<p>Please login to view your history.</p>";
    return;
  }

  try {
    const requestRef = collection(db, "Withdrawals", uid, "requests");
    const q = query(requestRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      statusList.innerHTML = "<p>No withdrawals yet.</p>";
      return;
    }

    // Clear previous content
    statusList.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();

      const entry = document.createElement("div");
      entry.classList.add("status-entry");

      // Add status class
      entry.classList.add(data.status.toLowerCase());

      // Format timestamp
      const createdAt = data.createdAt?.toDate().toLocaleString() || "Unknown date";

      // Build display text
      entry.innerHTML = `
        <p><strong>Method:</strong> ${data.method.toUpperCase()}</p>
        <p><strong>Amount:</strong> ₹${data.amount}</p>
        <p><strong>Status:</strong> ${capitalize(data.status)}</p>
        <p><strong>Requested At:</strong> ${createdAt}</p>
      `;

      statusList.appendChild(entry);
    });
  } catch (err) {
    console.error("Error loading history:", err);
    statusList.innerHTML = "<p>Error loading history.</p>";
  }
}

// Utility: Capitalize string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Load history on page load
window.addEventListener("DOMContentLoaded", loadWithdrawalHistory);
