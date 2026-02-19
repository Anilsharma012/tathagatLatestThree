import React from "react";
import "./PolicyPages.css";
import Footer from "../../components/Footer/Footer";

const RefundPolicy = () => {
  return (
    <>
      <div className="policy-page">
        <div className="policy-container">
          <h1 className="policy-title">Refund & Cancellation Policy</h1>

          <p>
            We provide two course trial alternatives to students who are interested in enrolling with TathaGat. A student may sign up for a 15-day course trial OR a demo class. A student may take the 15-day trial course, once he/she has enrolled by paying the fee as per the offered plan.
          </p>

          <p>
            The 15-day trial period is subject to the fee refund policy. If, over the course of 15-day trial—during which there will be at least 4–5 classes—a student experiences any problems, or, for any reason, decides against continuing with the enrolment, an unconditional fee refund will be provided.
          </p>

          <p>
            The students who sign up for the demo class will not be entitled to a fee refund. Also, any student who has been offered a fee rebate for any reasons shall not be eligible for any refund. This refund policy is applicable to all Fee for Self paid Students and Sponsored students who have paid Full Fee / Partial Fee.
          </p>

          <div className="policy-notice">
            <h3>Important Notice</h3>
            <p>
              Above mentioned Refund Policy is only applicable for students enrolling in our <strong>offline courses</strong>.
            </p>
            <p>
              The above mentioned Refund Policy is <strong>not applicable</strong> to students enrolling in any of the online courses/batches.
            </p>
            <p>
              We do not offer refunds for online products or courses. Students are advised to conduct proper due diligence before making a purchase.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RefundPolicy;
