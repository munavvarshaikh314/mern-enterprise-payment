// AdminPanel.js
import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPanel() {
  const [allPayments, setAllPayments] = useState([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/admin/payments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllPayments(res.data);
    };

    fetchAdminData();
  }, []);

  useEffect(() => {
  const token = localStorage.getItem("token");
  const decoded = JSON.parse(atob(token.split(".")[1]));
  if (decoded.role === "admin") {
    setIsAdmin(true);
  }
  {isAdmin && <AdminPanel />}

}, []);


  return (
    <div>
      <h2>Admin Payment Dashboard</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Payment ID</th>
            <th>Amount</th>
            <th>Verified</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {allPayments.map(p => (
            <tr key={p._id}>
              <td>{p.userId}</td>
              <td>{p.payment_id}</td>
              <td>₹{p.amount / 100}</td>
              <td>{p.verified ? "✅" : "❌"}</td>
              <td>{new Date(p.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
