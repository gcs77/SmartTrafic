from flask import Flask, jsonify, render_template, request

from numerical_methods.traffic_analysis import analyze_traffic
from simulation.traffic import SimulationConfig, build_final_presentation_summary, build_final_report, build_project_overview

app = Flask(__name__)


@app.post("/api/traffic-analysis")
def traffic_analysis():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    try:
        return jsonify(analyze_traffic(payload))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.route("/")
def index():
    scenarios = [
        SimulationConfig(arrival_a=1.2, arrival_b=1.0, service_a=2.0, service_b=1.8, green_time=10.0, yellow_time=2.0, total_time=60.0),
        SimulationConfig(arrival_a=1.8, arrival_b=1.4, service_a=2.2, service_b=2.0, green_time=8.0, yellow_time=2.0, total_time=60.0),
        SimulationConfig(arrival_a=2.2, arrival_b=2.5, service_a=2.6, service_b=2.2, green_time=7.0, yellow_time=2.5, total_time=60.0),
    ]
    summary = build_final_report(scenarios)
    overview = build_project_overview(scenarios)
    presentation = build_final_presentation_summary(scenarios)
    return render_template("index.html", scenario_summary=summary, project_overview=overview, presentation=presentation)


@app.route("/city")
def city():
    return render_template("city.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
