import streamlit as st
from classifier import classify_complaint

st.set_page_config(
    page_title="CampusHelp AI",
    page_icon="🏫",
    layout="wide"
)

st.title("🏫 CampusHelp AI")
st.subheader("Intelligent Campus Complaint Management System")

st.write(
    "Submit your campus complaint. "
    "Our AI system will identify the category "
    "and recommend the responsible department."
)

st.divider()

st.header("Submit a Complaint")

complaint = st.text_area(
    "Describe your problem:",
    placeholder="Example: Wi-Fi is not working in my classroom"
)

if st.button("Analyze Complaint"):

    if complaint.strip():

        result = classify_complaint(complaint)

        if isinstance(result, str):
            st.warning(result)
        else:
            st.success("Complaint analyzed successfully!")

            st.write("### AI Prediction")

            col1, col2 = st.columns(2)

            with col1:
                st.metric("Category", result["category"])

            with col2:
                st.metric(
                    "Confidence",
                    str(result["confidence"]) + "%"
                )

            st.write("**Responsible Department:**",
                     result["department"])

            if result["review_required"]:
                st.warning("Requires Human Review")
            else:
                st.success("Automatically Categorized")

    else:
        st.error("Please enter a complaint.")