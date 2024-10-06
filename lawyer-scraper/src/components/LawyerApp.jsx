import React, { useState, useEffect } from "react";
import { LawyerManager, specializationLinks } from "./LawyerManager";
import { ClipLoader } from "react-spinners";
import ProgressBar from "@ramonak/react-progress-bar";

const LawyerApp = () => {
  const [lawyers, setLawyers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");

  useEffect(() => {
    const lawyerManager = new LawyerManager();

    const fetchData = async () => {
      setLoading(true);
      setLoadingMessage("Fetching lawyers data, it may take a few minutes...");
      setProgress(0);

      try {
        const totalSpecializations = Object.keys(specializationLinks).length;
        const progressCallback = (message, progressPercent) => {
          setCurrentTask(message);
          setProgress(progressPercent);
        };

        const scrapedLawyers = await lawyerManager.scrapeLawyers(
          progressCallback,
          totalSpecializations
        );
        setLawyers(scrapedLawyers || []);
      } catch (err) {
        console.error("Failed to fetch lawyers:", err);
        setError("Failed to fetch lawyers. Please try again later.");
      } finally {
        setLoading(false);
        setLoadingMessage("");
        setCurrentTask("Completed!");
      }
    };

    fetchData();
  }, []);

  const exportData = () => {
    const lawyerManager = new LawyerManager();
    lawyerManager.exportToExcel(lawyers, "lawyers.xlsx");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Lawyers List</h1>

      {loading && (
        <>
          <ClipLoader color="#36d7b7" loading={loading} size={100} />
          <p>{loadingMessage}</p>

          <div style={{ width: "60%", margin: "20px auto" }}>
            <ProgressBar completed={progress} maxCompleted={100} />
          </div>

          <p>{currentTask}</p>
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && (
        <button onClick={exportData} disabled={lawyers.length === 0}>
          Export to Excel
        </button>
      )}
    </div>
  );
};

export default LawyerApp;
