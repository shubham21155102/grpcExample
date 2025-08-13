from concurrent import futures

import grpc

import proto.RiskScore_pb2_grpc as handler
from risk_score_servicer import RiskScoreServicer

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    handler.add_RiskScoreServicer_to_server(RiskScoreServicer(), server)
    server.add_insecure_port('[::]:50051')
    try:
        server.start()
        print("Server started @ 0.0.0.0:50051")
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)
        print("Server disconnected")


serve()
