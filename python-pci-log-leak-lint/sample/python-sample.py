import logging

import stripe
from flask import Flask, request

app = Flask(__name__)
logger = logging.getLogger("payments")


@app.route("/pay", methods=["POST"])
def pay():
    logger.info("incoming payment payload: %s", request.json)
    data = request.get_json()
    card_number = data["card_number"]
    cvv = data["cvv"]
    logger.debug("charging card %s", card_number)
    try:
        charge = stripe.Charge.create(amount=data["amount"], currency="usd", source=data["token"])
    except stripe.error.CardError as e:
        logger.error(f"card declined, cvv={cvv}: {e}")
        raise
    return {"id": charge.id}


@app.route("/terminal", methods=["POST"])
def terminal():
    track2 = request.form["track2"]
    print("swipe received", track2)
    return "ok"


@app.route("/login", methods=["POST"])
def login():
    user = request.form["user"]
    password = request.form["password"]
    if not check_login(user, password):
        logger.warning("login failed for %s using %s", user, password)
    logger.debug("auth headers: %s", request.headers)
    return "ok"
