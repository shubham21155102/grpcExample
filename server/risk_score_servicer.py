from __future__ import annotations
from proto.RiskScore_pb2 import RiskScoreRequest, RiskScoreUpdate
import proto.RiskScore_pb2_grpc as proto


class RiskScoreServicer(proto.RiskScoreServicer):

    def CalculateRiskScore(self, request: RiskScoreRequest, context):
        manufacturer_name = request.manufacturer
        device_name = request.device
        print(f"Calculating risk score for {manufacturer_name} {device_name}")
        # Initial message
        yield RiskScoreUpdate(
            status="STARTED",
            progress=0.0,
            risk_score=0.0,
            record_count=0,
            message=f"Thinking about {manufacturer_name} and {device_name}...",
            completed=False
        )
        # Simulate streaming progress
        for progress in [0.25, 0.5, 0.75]:
            yield RiskScoreUpdate(
                status="PROCESSING",
                progress=progress,
                risk_score=progress * 0.85,
                record_count=int(progress * 100),
                message=f"Progress: {int(progress*100)}%",
                completed=False
            )
            import time
            time.sleep(0.5)
        # Final message
        yield RiskScoreUpdate(
            status="success",
            progress=1.0,
            risk_score=0.85,
            record_count=100,
            message="Risk score calculated successfully.",
            completed=True
        )
