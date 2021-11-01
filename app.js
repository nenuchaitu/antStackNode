const express = require("express");
const path = require("path");
const cors = require("cors");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "offers.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(process.env.PORT || 3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//user
app.get("/offers/user", async (request, response) => {
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
//user apply coupon
app.post("/offers/user/", async (request, response) => {
  const { total, id } = request.body;
  const getOfferQuery = `SELECT * 
    FROM 
    coupons
    WHERE 
    id ='${id}';`;
  const offer = await db.get(getOfferQuery);
  if (offer !== undefined) {
    const currentDate = new Date();
    const finalDate = new Date(offer.end_date);
    if (finalDate < currentDate) {
      response.send("coupon expired");
    } else {
      if (offer.coupon_type !== "PERCENT") {
        response.send({ amount: offer.max_discount });
      } else {
        const maxDiscount = offer.max_discount;
        const percentageAmount = (offer.coupon_code.slice(0, 2) * total) / 100;
        if (percentageAmount > maxDiscount) {
          response.send({ amount: maxDiscount });
        } else {
          response.send({ amount: percentageAmount });
        }
      }
    }
  } else {
    response.send("Invalid Coupon Code");
  }
});
//admin
app.get("/offers/", async (request, response) => {
  const getOffersQuery = `SELECT * 
    FROM 
    coupons;`;
  const offersList = await db.all(getOffersQuery);
  response.send(offersList);
});
//update offers
app.put("/offers/edit", async (request, response) => {
  const {
    id,
    couponCode,
    startDate,
    endDate,
    couponType,
    maxDiscount,
    minAmount,
  } = request.body;
  const updateOfferQuery = `UPDATE coupons 
  SET coupon_code='${couponCode}',
      start_date='${startDate}',
      end_date='${endDate}',
      coupon_type='${couponType}',
      max_discount='${maxDiscount}',
      min_amount='${minAmount}' 
  WHERE id='${id}';`;
  await db.run(updateOfferQuery);
  response.send("Offer Successfully Updated");
});
/// add new offers
app.post("/offers/new", async (request, response) => {
  const {
    id,
    couponCode,
    startDate,
    endDate,
    couponType,
    maxDiscount,
    minAmount,
  } = request.body;
  const postOfferQuery = `INSERT INTO coupons(id,coupon_code,start_date,end_date,coupon_type,max_discount,min_amount)
                                VALUES ('${id}','${couponCode}','${startDate}', '${endDate}', '${couponType}', '${maxDiscount}', '${minAmount}');`;
  await db.run(postOfferQuery);
  response.send("Offer Successfully Added");
});
app.delete("/offers/:offerId/", async (request, response) => {
  const { offerId } = request.params;
  const deleteOfferQuery = `DELETE FROM coupons WHERE id='${offerId}';`;
  await db.run(deleteOfferQuery);
  response.send("Offer Removed");
});
//export module
module.exports = app;
