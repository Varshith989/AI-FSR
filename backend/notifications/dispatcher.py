import abc
import enum
from typing import List, Dict, Any, Optional


class NotificationEvent(str, enum.Enum):
    RECALL_RISK_HIGH = "RECALL_RISK_HIGH"
    BATCH_QUARANTINED = "BATCH_QUARANTINED"
    AUDIT_DUE = "AUDIT_DUE"
    CAPA_OVERDUE = "CAPA_OVERDUE"
    REGULATION_UPDATED = "REGULATION_UPDATED"
    DOCUMENT_EXPIRED = "DOCUMENT_EXPIRED"
    SUPPLIER_RISK_HIGH = "SUPPLIER_RISK_HIGH"
    LABEL_NON_COMPLIANT = "LABEL_NON_COMPLIANT"


class NotificationChannel(abc.ABC):
    @abc.abstractmethod
    def send(self, event: NotificationEvent, message: str, recipient: str, payload: Dict[str, Any]) -> bool:
        pass


class InAppNotificationChannel(NotificationChannel):
    def __init__(self):
        self.notifications: List[Dict[str, Any]] = []

    def send(self, event: NotificationEvent, message: str, recipient: str, payload: Dict[str, Any]) -> bool:
        self.notifications.append({
            "event": event.value,
            "message": message,
            "recipient": recipient,
            "payload": payload,
            "status": "DELIVERED"
        })
        return True


class EmailNotificationChannel(NotificationChannel):
    def send(self, event: NotificationEvent, message: str, recipient: str, payload: Dict[str, Any]) -> bool:
        # In MVP, logs simulated dispatch
        return True


class NotificationDispatcher:
    """
    Pluggable Notification Dispatcher (§8) implementing the Strategy Pattern
    to decouple event producers from delivery channels (Email, SMS, Push, In-app, Teams/Slack).
    """
    def __init__(self):
        self._channels: Dict[str, NotificationChannel] = {
            "in_app": InAppNotificationChannel(),
            "email": EmailNotificationChannel()
        }

    def register_channel(self, name: str, channel: NotificationChannel):
        self._channels[name] = channel

    def dispatch(self, event: NotificationEvent, message: str, recipient: str, payload: Dict[str, Any]) -> Dict[str, bool]:
        results = {}
        for name, channel in self._channels.items():
            results[name] = channel.send(event, message, recipient, payload)
        return results


dispatcher = NotificationDispatcher()


def emit_notification(event: NotificationEvent, message: str, recipient: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, bool]:
    """Emit a food safety alert across all registered channels."""
    return dispatcher.dispatch(event, message, recipient, payload or {})
