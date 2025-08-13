from concurrent import futures
import logging
import grpc

import proto.RiskScore_pb2_grpc as handler
from risk_score_servicer import RiskScoreServicer

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def serve():
    # Use a more conservative thread pool to reduce race conditions
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=1))
    handler.add_RiskScoreServicer_to_server(RiskScoreServicer(), server)
    server.add_insecure_port('[::]:50051')
    try:
        server.start()
        logger.info("Server started @ 0.0.0.0:50051")
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)
        logger.info("Server disconnected")


serve()
