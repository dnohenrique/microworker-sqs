#Inicia o processo através SQS AWS

sam local invoke Function -e .\events\event-sqs.json --debug-port 5858 --docker-network microworker-emiti-reserva_default
