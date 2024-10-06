import axios from "axios";
import { load } from "cheerio";
import { Lawyer } from "./Lawyer";
import iconv from "iconv-lite";
import { Buffer } from "buffer";
import * as XLSX from "xlsx";

export const specializationLinks = {
  "נזקי גוף תאונות": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=314",
  "דיני משפחה": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3111",
  "דיני עבודה": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=313",
  פלילי: "https://www.din.co.il/SearchLawyer.asp?it=31&cid=313",
  תעבורה: "https://www.din.co.il/SearchLawyer.asp?it=31&cid=318",
  "מקרקעין נדלן": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3113",
  "הוצאה לפועל": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=317",
  "משפט מנהלי ועתירות": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3119",
  "קניין רוחני": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3121",
  "משפט מסחרי ועסקים": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=316",
  "משפט אזרחי": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3118",
  "תביעות ביטוח ונזקי רכוש":
    "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3112",
  "רשלנות רפואית": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=315",
  "דיני מיסים": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3110",
  "גישור ובוררות": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3120",
  "משרד הביטחון": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=319",
  "מדינות והגירה-דרכון זר":
    "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3116",
  "דיני אינטרנט ורשת": "https://www.din.co.il/SearchLawyer.asp?it=31&cid=3117",
};

export class LawyerManager {
  constructor() {
    this.lawyers = [];
  }

  async scrapeLawyers(progressCallback, totalSpecializations) {
    try {
      this.lawyers = [];

      let specializationCount = 0;

      for (const [specialization, url] of Object.entries(specializationLinks)) {
        specializationCount++;

        // Calculate progress percentage based on number of specializations
        const progressPercent = Math.floor(
          (specializationCount / totalSpecializations) * 100
        );

        progressCallback(
          `Starting to scrape: ${specialization}`,
          progressPercent
        );

        let hasNextPage = true;
        let currentPageUrl = url;
        let pageCount = 1;

        while (hasNextPage) {
          progressCallback(
            `Scraping page ${pageCount} of ${specialization}`,
            progressPercent
          );

          const { data: rawData } = await axios({
            method: "get",
            url: currentPageUrl,
            responseType: "arraybuffer",
          });

          const decodedData = iconv.decode(
            Buffer.from(rawData),
            "windows-1255"
          );
          const $ = load(decodedData);

          let lawyerFound = false;

          $(".index-card").each((index, element) => {
            lawyerFound = true;

            const name = $(element).find(".index-card__name").text().trim();
            const city = $(element).find(".index-card__address").text().trim();
            const phone = $(element)
              .find('[itemprop="telephone"]')
              .text()
              .trim();

            const ratingCount = $(element)
              .find(".index-card__rating")
              .attr("title")
              .match(/(\d+)/g);
            const rating = ratingCount ? `${ratingCount[0]}/5` : "לא צויין";

            if (name) {
              const lawyer = new Lawyer(
                name,
                city,
                phone,
                rating,
                specialization
              );
              this.lawyers.push(lawyer);
            }
          });

          const nextPageButton = $(".page-next a").attr("href");

          if (lawyerFound && nextPageButton) {
            currentPageUrl = `https://www.din.co.il${nextPageButton}`;
            pageCount++;
          } else {
            hasNextPage = false;
          }
        }

        progressCallback(
          `Finished scraping: ${specialization}`,
          progressPercent
        );
      }

      progressCallback("All specializations scraped successfully.", 100);
      return this.lawyers;
    } catch (error) {
      progressCallback(`Error scraping lawyers: ${error.message}`, 0);
      return [];
    }
  }

  exportToExcel(lawyers, filename) {
    if (lawyers.length === 0) {
      console.error("No lawyers to export.");
      return;
    }

    const lawyersData = lawyers.map((lawyer) => ({
      Name: lawyer.name,
      City: lawyer.city,
      Phone: lawyer.phone,
      Rating: lawyer.rating,
      Specialization: lawyer.specialization,
    }));

    const worksheet = XLSX.utils.json_to_sheet(lawyersData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lawyers");

    const columnWidths = [
      { wch: 30 }, // Name
      { wch: 20 }, // City
      { wch: 15 }, // Phone
      { wch: 10 }, // Rating
      { wch: 30 }, // Specialization
    ];

    worksheet["!cols"] = columnWidths;

    XLSX.writeFile(workbook, filename);
  }
}
