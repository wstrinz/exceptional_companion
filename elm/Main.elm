module Hello exposing (..)

import Html exposing (div, p, ul, li, text)
import Html.Events exposing (onClick)
import Ports
import Types exposing (..)


view : Model -> Html.Html Msg
view m =
    case m.currView of
        Hidden ->
            div []
                [ Html.button [ onClick <| QueueAction ChoosePlan ] [ text "choose" ]
                , Html.button [ onClick <| QueueAction TryAgain ] [ text "try" ]
                ]

        Shown ->
            div []
                [ ul []
                    [ li []
                        [ text "Here is div again" ]
                    ]
                ]


initialModel : Model
initialModel =
    { currView = Hidden }


update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
    case msg of
        Noop ->
            ( model, Cmd.none )

        QueueAction act ->
            case act of
                ChoosePlan ->
                    ( model, Ports.choosePlan "dummystring" )

                TryAgain ->
                    ( model, Ports.tryAgain "dummystring" )

        NextAction str ->
            ( model, Ports.tryAgain "dummystring" )


main : Program Never Model Msg
main =
    Html.program
        { init = ( initialModel, Cmd.none )
        , view = view
        , update = update
        , subscriptions = \_ -> Sub.none
        }
