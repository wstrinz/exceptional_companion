module Types exposing (..)


type DisplayedState
    = Hidden
    | Shown


type alias Model =
    { currView : DisplayedState }


type Msg
    = Noop
    | ChoosePlan
    | TryAgain
