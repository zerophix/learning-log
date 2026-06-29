from pydantic import BaseModel
from typing import Optional, List


class TagCreate(BaseModel):
    tag_id: str
    tag_name: str
    tag_category: str
    tag_description: Optional[str] = None
    parent_tag_id: Optional[str] = None
    energy_level: int = 3


class TagLinkCreate(BaseModel):
    source_tag_id: str
    target_tag_id: str
    link_type: str
    link_description: Optional[str] = None


class LearningEntryCreate(BaseModel):
    topic: str
    insight: str
    summary: Optional[str] = None
    diagram: Optional[str] = None
    code_snippet: Optional[str] = None
    star_situation: Optional[str] = None
    star_task: Optional[str] = None
    star_action: Optional[str] = None
    star_result: Optional[str] = None
    topic_tag_id: Optional[str] = None
    project_tag_id: Optional[str] = None
    research_type: str = "deep-research"
    related_tag_ids: List[str] = []
    custom_tags: List[str] = []
    analogy: Optional[str] = None
    transfer_pattern: Optional[str] = None
    energy_level: int = 3
    aha_moment: bool = False
    source: str = "ai-chat"
    confidence_rating: Optional[int] = None


class LearningEntryUpdate(BaseModel):
    topic: Optional[str] = None
    insight: Optional[str] = None
    summary: Optional[str] = None
    diagram: Optional[str] = None
    code_snippet: Optional[str] = None
    star_situation: Optional[str] = None
    star_task: Optional[str] = None
    star_action: Optional[str] = None
    star_result: Optional[str] = None
    topic_tag_id: Optional[str] = None
    project_tag_id: Optional[str] = None
    research_type: Optional[str] = None
    related_tag_ids: Optional[List[str]] = None
    custom_tags: Optional[List[str]] = None
    analogy: Optional[str] = None
    transfer_pattern: Optional[str] = None
    energy_level: Optional[int] = None
    aha_moment: Optional[bool] = None
    source: Optional[str] = None
    confidence_rating: Optional[int] = None


class BatchEntryRequest(BaseModel):
    ids: List[int]


class NLCommandCreate(BaseModel):
    command_text: str
    intent_category: Optional[str] = None
    skill_triggered: Optional[str] = None
    execution_status: str = "success"
    is_effective: bool = True
