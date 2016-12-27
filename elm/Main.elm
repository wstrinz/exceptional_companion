module Hello exposing (..)

import Html exposing (div, p, ul, li, text)


type DisplayedState
    = Hidden
    | Shown


type alias Model =
    { currView : DisplayedState }


type Msg
    = Noop
    | Something


view : Model -> Html.Html msg
view m =
    case m.currView of
        Hidden ->
            text "nothing here"

        Shown ->
            div []
                [ ul []
                    [ li []
                        [ text "Here is div again" ]
                    ]
                ]


model : Model
model =
    { currView = Hidden }


update : Msg -> Model -> Model
update msg m =
    m


main : Program Never Model Msg
main =
    Html.beginnerProgram
        { model = model
        , view = view
        , update = update
        }
