from __future__ import annotations
from proto.RiskScore_pb2 import RiskScoreRequest, RiskScoreUpdate
import proto.RiskScore_pb2_grpc as proto


class RiskScoreServicer(proto.RiskScoreServicer):

    def CalculateRiskScore(self, request: RiskScoreRequest, context) -> RiskScoreUpdate:
        manufacturer_name = request.manufacturer
        device_name = request.device
        print(f"Calculating risk score for {manufacturer_name} {device_name}")
        response = RiskScoreUpdate(
            status="success",
            progress=0.75,
            risk_score=0.85,
            record_count=100,
            message="Risk score calculated successfully.",
            completed=True
        )
        return response
