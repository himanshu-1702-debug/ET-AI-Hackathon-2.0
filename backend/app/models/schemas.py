from pydantic import BaseModel
from typing import Optional


class QueryRequest(BaseModel):
    question: str
    max_hops: int = 2
    language: str = "en"  # 'en', 'hi', 'mr', 'ta'


class ThreadIngestRequest(BaseModel):
    text: str
    source_label: str = "whatsapp_thread"


class ComplianceCheckRequest(BaseModel):
    scope_query: str


class EvidencePackageRequest(BaseModel):
    scope: str


class RCARequest(BaseModel):
    equipment_query: str


class PatternMiningRequest(BaseModel):
    focus_area: str = ""


class RoutingAckRequest(BaseModel):
    finding_id: str


class OnboardingRequest(BaseModel):
    role: str
    area: str


class TacitInterviewMessage(BaseModel):
    role: str  # "assistant" or "user"
    content: str


class TacitNextQuestionRequest(BaseModel):
    expertise_area: str
    conversation_history: list[TacitInterviewMessage] = []


class TacitFinalizeRequest(BaseModel):
    expertise_area: str
    conversation_history: list[TacitInterviewMessage] = []
