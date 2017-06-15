module Types exposing (..)


type DisplayedState
    = Hidden
    | Shown


type alias Model =
    { currView : DisplayedState }


type Action
    = ChoosePlan
    | TryAgain


type Msg
    = Noop
    | QueueAction Action
    | NextAction String
