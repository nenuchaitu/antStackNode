const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "offers.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//user
app.get("/offers/", async (request, response) => {
  const getOffersQuery = `SELECT * 
    FROM 
    coupons
    WHERE coupon_type IN ('FLAT','PERCENT');`;
  const offersList = await db.all(getOffersQuery);
  response.send(
    offersList.map((offer) => ({
      id: offer.id,
      coupon_code: offer.coupon_code,
      max_discount: offer.max_discount,
      min_amount: offer.min_amount,
      coupon_type: offer.coupon_type,
    }))
  );
});
app.get("/offers/:offerCode/", async (request, response) => {
  const { offerCode } = request.params;
  const getOfferQuery = `SELECT * 
    FROM 
    coupons
    WHERE 
    coupon_code='${offerCode}';`;
  const offer = await db.get(getOfferQuery);
  if (offer !== undefined) {
    const CurrentDate = new Date();
    const finalDate = new Date(offer.end_date);

    if (finalDate < CurrentDate) {
      response.send("coupon expired");
    } else {
      response.send(offer);
    }
  } else {
    response.send("Invalid Coupon Code");
  }
});
//admin
app.post("/offers/", authenticationToken, async (request, response) => {
  const {
    couponCode,
    startDate,
    endDate,
    couponType,
    maxDiscount,
    minAmount,
  } = request.body;
  const postOfferQuery = `INSERT INTO coupons(coupon_code,start_date,end_date,coupon_type,max_discount,min_amount)
                                VALUES ('${couponCode}','${startDate}', '${endDate}', '${couponType}', '${maxDiscount}', '${minAmount}');`;
  await db.run(postOfferQuery);
  response.send("Offer Successfully Added");
});
app.delete(
  "/districts/:offerId/",
  authenticationToken,
  async (request, response) => {
    const { offerId } = request.params;
    const deleteOfferQuery = `DELETE FROM coupons WHERE id='${offerId}';`;
    await db.run(deleteOfferQuery);
    response.send("Offer Removed");
  }
);
module.exports = app;
