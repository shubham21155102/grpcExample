from __future__ import annotations
from proto.RiskScore_pb2 import RiskScoreRequest, RiskScoreUpdate
import proto.RiskScore_pb2_grpc as proto
import threading
import time
import logging

# Configure logging to avoid print statement race conditions
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(threadName)s - %(message)s')
logger = logging.getLogger(__name__)


class RiskScoreServicer(proto.RiskScoreServicer):
    def __init__(self):
        self._lock = threading.Lock()

    def CalculateRiskScore(self, request: RiskScoreRequest, context):
        with self._lock:
            manufacturer_name = request.manufacturer
            device_name = request.device

            # Use logger instead of print to avoid race conditions
            logger.info(
                f"Calculating risk score for {manufacturer_name} {device_name}")

            # Give context to the user
            content = f"User has selected {manufacturer_name} and {device_name} for risk assessment."

            # Yield initial status
            yield RiskScoreUpdate(
                status="info",
                progress=0.0,
                risk_score=0.0,
                record_count=0,
                message=content,
                completed=False
            )

            # Simulate some processing time to avoid race conditions
            time.sleep(0.1)

            # Yield final result
            yield RiskScoreUpdate(
                status="success",
                progress=1.0,
                risk_score=0.85,
                record_count=100,
                message="Risk score calculated successfully.",
                completed=True
            )
