module Types exposing (..)


type DisplayedState
    = Hidden
    | Shown


type alias Model =
    { currView : DisplayedState, actions : List Action, acting : Bool }


type Action
    = ChoosePlan
    | TryAgain


type Msg
    = Noop
    | QueueAction (List Action)
    | NextAction String
