import React, { useState } from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Farmer from "./components/Farmer";
import Buyer from "./components/Buyer";
import Transport from "./components/Transport";

function App() {

  const [crops, setCrops] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [orders, setOrders] =
    useState([]);

  const [transportDeals,
    setTransportDeals] =
    useState([]);

  return (

    <Router>

      <Navbar />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        {/* Farmer */}

        <Route
          path="/farmer"
          element={

            <Farmer
              crops={crops}
              setCrops={setCrops}

              requests={requests}
              setRequests={setRequests}

              orders={orders}
              setOrders={setOrders}

              transportDeals={transportDeals}
              setTransportDeals={setTransportDeals}

            />

          }
        />

        {/* Buyer */}

        <Route
          path="/buyer"
          element={

            <Buyer
              crops={crops}
              setCrops={setCrops}

              requests={requests}
              setRequests={setRequests}

              orders={orders}
              setOrders={setOrders}

            />

          }
        />

        {/* Transport */}

        <Route
          path="/transport"
          element={

            <Transport
              transportDeals={transportDeals}
            />

          }
        />

      </Routes>

    </Router>

  );
}

export default App;